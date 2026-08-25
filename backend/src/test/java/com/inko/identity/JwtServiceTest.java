package com.inko.identity;

import com.inko.identity.security.JwtProperties;
import com.inko.identity.security.JwtService;
import com.inko.identity.security.JwtService.InvalidTokenException;
import com.inko.identity.security.JwtService.TokenExpiredException;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtServiceTest {

    private static final String SECRET = "unit-test-secret-0123456789abcdef0123456789abcdef";
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID SHOP_ID = UUID.randomUUID();

    private JwtService service(long validityMinutes) {
        return new JwtService(new JwtProperties(SECRET, validityMinutes, 7));
    }

    @Test
    void roundTripsClaims() {
        JwtService jwt = service(15);
        String token = jwt.issueAccessToken(USER_ID,
                List.of("ROLE_CUSTOMER"), List.of("shop:manage_own"), SHOP_ID);

        JwtService.DecodedToken decoded = jwt.verify(token);
        assertEquals(USER_ID, decoded.userId());
        assertEquals(List.of("ROLE_CUSTOMER"), decoded.roles());
        assertEquals(List.of("shop:manage_own"), decoded.permissions());
        assertEquals(SHOP_ID, decoded.shopId());
    }

    @Test
    void expiredTokenIsRejected() {
        JwtService jwt = service(0); // expires immediately
        String token = jwt.issueAccessToken(USER_ID, List.of(), List.of(), null);
        assertThrows(TokenExpiredException.class, () -> jwt.verify(token));
    }

    @Test
    void tamperedSignatureIsRejected() {
        JwtService issuer = service(15);
        JwtService otherKey = new JwtService(
                new JwtProperties("another-secret-0123456789abcdef0123456789abcdef", 15, 7));
        String token = issuer.issueAccessToken(USER_ID, List.of(), List.of(), null);

        InvalidTokenException ex =
                assertThrows(InvalidTokenException.class, () -> otherKey.verify(token));
        assertNotNull(ex.getMessage());
        assertTrue(ex instanceof TokenExpiredException || ex.getMessage().contains("signature"));
    }

    @Test
    void malformedTokenIsRejected() {
        JwtService jwt = service(15);
        assertThrows(InvalidTokenException.class, () -> jwt.verify("not-a-jwt"));
    }
}
