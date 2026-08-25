package com.inko.identity;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end auth/RBAC checks against the real local database (PostgreSQL must be running).
 * Covers the phase checklist: valid login, invalid login, expired/invalid token, refresh
 * rotation + replay detection, OTP login, suspended account, wrong role, cross-shop access.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthFlowIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper om;

    // ---- helpers -----------------------------------------------------------

    private String json(Object body) throws Exception {
        return om.writeValueAsString(body);
    }

    private ResultActions postJson(String path, Object body) throws Exception {
        return mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(json(body)));
    }

    private ResultActions getWith(String path, String token) throws Exception {
        var b = get(path);
        if (token != null) {
            b.header("Authorization", "Bearer " + token);
        }
        return mvc.perform(b);
    }

    private ResultActions patchWith(String path, Object body, String token) throws Exception {
        return mvc.perform(patch(path)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(body)));
    }

    private JsonNode bodyOf(ResultActions actions) throws Exception {
        String content = actions.andReturn().getResponse().getContentAsString();
        return om.readTree(content);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> login(String identifier, String password) throws Exception {
        ResultActions r = postJson("/api/auth/login",
                Map.of("identifier", identifier, "password", password));
        r.andExpect(status().isOk());
        return om.readValue(bodyOf(r).toString(), Map.class);
    }

    // ---- tests -------------------------------------------------------------

    @Test
    void registerLoginMeHappyPath() throws Exception {
        String email = "it-" + System.nanoTime() + "@test.local";

        ResultActions reg = postJson("/api/auth/register", Map.of(
                "fullName", "Integration Tester",
                "email", email,
                "password", "Password@123"));
        reg.andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.roles[0]").value("CUSTOMER"));

        String token = bodyOf(reg).get("accessToken").asText();

        getWith("/api/users/me", token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email.toLowerCase()))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void invalidLoginRejected() throws Exception {
        postJson("/api/auth/login", Map.of(
                        "identifier", "customer1@inko.local", "password", "wrong-password"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void meRequiresAuthentication() throws Exception {
        getWith("/api/users/me", null)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        getWith("/api/users/me", "garbage.token.value")
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshRotationWithReplayDetection() throws Exception {
        Map<String, Object> session = login("customer1@inko.local", "Customer@Dev123");
        String originalRefresh = (String) session.get("refreshToken");

        ResultActions first = postJson("/api/auth/refresh", Map.of("refreshToken", originalRefresh));
        first.andExpect(status().isOk());
        String rotatedRefresh = bodyOf(first).get("refreshToken").asText();
        assertNotEquals(originalRefresh, rotatedRefresh);

        // replaying the old one fails AND kills the whole family
        postJson("/api/auth/refresh", Map.of("refreshToken", originalRefresh))
                .andExpect(status().isUnauthorized());

        postJson("/api/auth/refresh", Map.of("refreshToken", rotatedRefresh))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutRevokesRefreshToken() throws Exception {
        Map<String, Object> session = login("customer1@inko.local", "Customer@Dev123");

        postJson("/api/auth/logout", Map.of("refreshToken", session.get("refreshToken")))
                .andExpect(status().isOk());

        postJson("/api/auth/refresh", Map.of("refreshToken", session.get("refreshToken")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void mockOtpLoginFlow() throws Exception {
        ResultActions issue = postJson("/api/auth/otp/request", Map.of("identifier", "+919000000003"));
        issue.andExpect(status().isOk())
                .andExpect(jsonPath("$.delivered").value(true));

        String code = bodyOf(issue).get("devCode").asText();
        assertEquals(6, code.length());

        String wrong = "000000".equals(code) ? "111111" : "000000";
        postJson("/api/auth/otp/verify", Map.of("identifier", "+919000000003", "code", wrong))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("OTP_INVALID"));

        postJson("/api/auth/otp/verify", Map.of("identifier", "+919000000003", "code", code))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    @Test
    void suspendedAccountCannotLoginAndLosesAccess() throws Exception {
        Map<String, Object> adminSession = login("admin@inko.local", "Admin@Dev123");
        String adminToken = (String) adminSession.get("accessToken");

        String listBody = getWith("/api/admin/users?query=customer1@inko.local", adminToken)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String customer1Id = om.readTree(listBody).get("content").get(0).get("id").asText();

        // customer has a working session now…
        Map<String, Object> customerSession = login("customer1@inko.local", "Customer@Dev123");
        String customerToken = (String) customerSession.get("accessToken");

        patchWith("/api/admin/users/" + customer1Id + "/status",
                        Map.of("status", "SUSPENDED"), adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUSPENDED"));

        // login blocked…
        postJson("/api/auth/login", Map.of(
                        "identifier", "customer1@inko.local", "password", "Customer@Dev123"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCOUNT_SUSPENDED"));

        // …and existing access token is dead immediately
        getWith("/api/users/me", customerToken).andExpect(status().isUnauthorized());

        // reactivate for dev use / other tests
        patchWith("/api/admin/users/" + customer1Id + "/status",
                        Map.of("status", "ACTIVE"), adminToken)
                .andExpect(status().isOk());
    }

    @Test
    void wrongRoleCannotUseAdminEndpoints() throws Exception {
        Map<String, Object> customer = login("customer1@inko.local", "Customer@Dev123");
        Map<String, Object> admin = login("admin@inko.local", "Admin@Dev123");

        getWith("/api/admin/users", (String) customer.get("accessToken"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));

        getWith("/api/admin/users", (String) admin.get("accessToken"))
                .andExpect(status().isOk());
    }

    @Test
    void shopkeeperCannotAccessAnotherShop() throws Exception {
        String shopsBody = mvc.perform(get("/api/shops")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String shopOneId = null;
        String shopTwoId = null;
        for (var node : om.readTree(shopsBody)) {
            switch (node.get("name").asText()) {
                case "Inko Xerox Point" -> shopOneId = node.get("id").asText();
                case "Campus Print Hub" -> shopTwoId = node.get("id").asText();
                default -> { /* ignore */ }
            }
        }
        assertNotNull(shopOneId, "seeded shop 1 missing from discovery");
        assertNotNull(shopTwoId, "seeded shop 2 missing from discovery");

        Map<String, Object> keeper1 = login("keeper1@inko.local", "Keeper@Dev123");
        Map<String, Object> keeper2 = login("keeper2@inko.local", "Keeper@Dev123");

        // own shop: allowed
        getWith("/api/shops/" + shopOneId, (String) keeper1.get("accessToken"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Inko Xerox Point"));

        // cross-shop: forbidden
        getWith("/api/shops/" + shopOneId, (String) keeper2.get("accessToken"))
                .andExpect(status().isForbidden());

        // admins can see everything; customers may inspect shops they want to print at
        Map<String, Object> admin = login("admin@inko.local", "Admin@Dev123");
        getWith("/api/shops/" + shopTwoId, (String) admin.get("accessToken"))
                .andExpect(status().isOk());

        Map<String, Object> customer = login("customer1@inko.local", "Customer@Dev123");
        getWith("/api/shops/" + shopOneId, (String) customer.get("accessToken"))
                .andExpect(status().isOk());
    }

    @Test
    void forgotPasswordResetRoundTrip() throws Exception {
        String email = "reset-" + System.nanoTime() + "@test.local";
        postJson("/api/auth/register", Map.of(
                "fullName", "Reset Flow", "email", email, "password", "Original@123"))
                .andExpect(status().isCreated());

        ResultActions issue = postJson("/api/auth/forgot-password", Map.of("email", email));
        issue.andExpect(status().isOk());
        String code = bodyOf(issue).get("devCode").asText();

        postJson("/api/auth/reset-password", Map.of(
                "identifier", email, "code", code, "newPassword", "NewPass@456"))
                .andExpect(status().isOk());

        postJson("/api/auth/login", Map.of("identifier", email, "password", "Original@123"))
                .andExpect(status().isUnauthorized());
        postJson("/api/auth/login", Map.of("identifier", email, "password", "NewPass@456"))
                .andExpect(status().isOk());
    }

    @Test
    void duplicateRegistrationRejected() throws Exception {
        var body = Map.of("fullName", "Dup", "email",
                "dup-" + System.nanoTime() + "@test.local", "password", "Password@123");
        postJson("/api/auth/register", body).andExpect(status().isCreated());
        postJson("/api/auth/register", body).andExpect(status().isConflict());
    }

    @Test
    void validationErrorsAreStructured() throws Exception {
        postJson("/api/auth/register", Map.of(
                        "fullName", "", "email", "not-an-email", "password", "short"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.traceId").isNotEmpty());
    }
}
