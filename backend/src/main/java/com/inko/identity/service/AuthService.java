package com.inko.identity.service;

import com.inko.common.error.ApiException;
import com.inko.common.error.ErrorCode;
import com.inko.identity.domain.OtpCode;
import com.inko.identity.domain.OtpPurpose;
import com.inko.identity.domain.Permission;
import com.inko.identity.domain.Role;
import com.inko.identity.domain.RoleName;
import com.inko.identity.domain.User;
import com.inko.identity.domain.UserStatus;
import com.inko.identity.repo.OtpCodeRepository;
import com.inko.identity.repo.RefreshTokenRepository;
import com.inko.identity.repo.RoleRepository;
import com.inko.identity.repo.UserRepository;
import com.inko.identity.security.JwtProperties;
import com.inko.identity.security.JwtService;
import com.inko.identity.web.dto.AuthDtos.AuthResponse;
import com.inko.identity.web.dto.AuthDtos.OtpIssueResponse;
import com.inko.identity.web.dto.AuthDtos.UserDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final Duration OTP_VALIDITY = Duration.ofMinutes(5);

    private final UserRepository users;
    private final RoleRepository roles;
    private final RefreshTokenRepository refreshTokens;
    private final OtpCodeRepository otpCodes;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final ShopLookup shopLookup;
    private final TokenRevocationService revocationService;
    private final boolean devMode;

    private final SecureRandom random = new SecureRandom();
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthService(UserRepository users,
                       RoleRepository roles,
                       RefreshTokenRepository refreshTokens,
                       OtpCodeRepository otpCodes,
                       JwtService jwtService,
                       JwtProperties jwtProperties,
                       ShopLookup shopLookup,
                       TokenRevocationService revocationService,
                       @Value("${inko.app.dev-mode:true}") boolean devMode) {
        this.users = users;
        this.roles = roles;
        this.refreshTokens = refreshTokens;
        this.otpCodes = otpCodes;
        this.jwtService = jwtService;
        this.jwtProperties = jwtProperties;
        this.shopLookup = shopLookup;
        this.revocationService = revocationService;
        this.devMode = devMode;
    }

    // ---------- Registration & login ----------

    @Transactional
    public AuthResponse register(String fullName, String email, String phone, String password) {
        if ((email == null || email.isBlank()) && (phone == null || phone.isBlank())) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED,
                    "Either an email address or a phone number is required");
        }
        String normalizedEmail = email == null || email.isBlank() ? null : email.toLowerCase();
        String normalizedPhone = phone == null || phone.isBlank() ? null : phone;

        if (normalizedEmail != null && users.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ApiException(ErrorCode.CONFLICT, "An account with this email already exists");
        }
        if (normalizedPhone != null && users.existsByPhone(normalizedPhone)) {
            throw new ApiException(ErrorCode.CONFLICT, "An account with this phone number already exists");
        }

        User user = new User(fullName.trim(), normalizedEmail, normalizedPhone, encoder.encode(password),
                UserStatus.ACTIVE);
        user.getRoles().add(role(RoleName.CUSTOMER));
        users.save(user);

        if (normalizedEmail != null) {
            issueOtp(normalizedEmail, OtpPurpose.VERIFY_EMAIL); // delivery deferred — see DEFERRED.md
        }
        log.info("Registered customer {}", user.getId());
        return issueAuthResponse(user);
    }

    @Transactional
    public AuthResponse loginByIdentifierAndPassword(String identifier, String password) {
        User user = findUserOrThrow(identifier.toLowerCase());
        requireActive(user);
        if (user.getPasswordHash() == null || !encoder.matches(password, user.getPasswordHash())) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS, "Invalid identifier or password");
        }
        user.setLastLoginAt(Instant.now());
        return issueAuthResponse(user);
    }

    /**
     * Guest checkout: creates an ephemeral CUSTOMER account (no email/phone) and issues a real
     * JWT pair so every existing secured endpoint works unchanged. Login remains optional.
     */
    @Transactional
    public AuthResponse createGuestSession() {
        String syntheticEmail = "guest-" + UUID.randomUUID() + "@guest.inko.local";
        User guest = new User("Guest", syntheticEmail, null, encoder.encode(UUID.randomUUID().toString()), UserStatus.ACTIVE);
        guest.getRoles().add(role(RoleName.CUSTOMER));
        users.save(guest);
        log.info("Created guest session {}", guest.getId());
        return issueAuthResponse(guest);
    }

    // ---------- Refresh rotation / logout ----------

    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        var token = refreshTokens.findByHashForUpdate(sha256Hex(rawRefreshToken))
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_TOKEN, "Unknown refresh token"));
        if (token.isRevoked()) {
            log.warn("Refresh token replay detected for user {}; revoking all sessions",
                    token.getUser().getId());
            revocationService.revokeAllForUser(token.getUser().getId()); // commits independently
            throw new ApiException(ErrorCode.INVALID_TOKEN, "Refresh token was already used");
        }
        if (token.isExpired(Instant.now())) {
            throw new ApiException(ErrorCode.INVALID_TOKEN, "Refresh token expired");
        }
        requireActive(token.getUser());

        token.setRevokedAt(Instant.now());
        return issueAuthResponse(token.getUser());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokens.findByHashForUpdate(sha256Hex(rawRefreshToken))
                .filter(t -> !t.isRevoked())
                .ifPresent(t -> t.setRevokedAt(Instant.now()));
    }

    // ---------- OTP flows (mock provider — see DEFERRED.md) ----------

    @Transactional
    public OtpIssueResponse requestLoginOtp(String identifier) {
        String id = identifier.toLowerCase();
        User user = users.findByEmailIgnoreCaseOrPhone(id, id)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND,
                        "No account found for this identifier"));
        requireActive(user);
        String code = issueOtp(id, OtpPurpose.LOGIN);
        return new OtpIssueResponse(true, "mock-sms", devMode ? code : null);
    }

    @Transactional
    public AuthResponse verifyLoginOtp(String identifier, String code) {
        User user = findUserOrThrow(identifier.toLowerCase());
        consumeOtp(identifier.toLowerCase(), OtpPurpose.LOGIN, code);
        user.setLastLoginAt(Instant.now());
        return issueAuthResponse(user);
    }

    @Transactional
    public OtpIssueResponse forgotPassword(String email) {
        String normalized = email.toLowerCase();
        User user = users.findByEmailIgnoreCase(normalized)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND,
                        "No account found with that email"));
        requireActive(user);
        String code = issueOtp(normalized, OtpPurpose.RESET_PASSWORD);
        return new OtpIssueResponse(true, "mock-email", devMode ? code : null);
    }

    @Transactional
    public void resetPassword(String identifier, String code, String newPassword) {
        String id = identifier.toLowerCase();
        User user = findUserOrThrow(id);
        consumeOtp(id, OtpPurpose.RESET_PASSWORD, code);
        user.setPasswordHash(encoder.encode(newPassword));
        refreshTokens.revokeAllForUser(user.getId(), Instant.now());
        log.info("Password reset completed for user {}", user.getId());
    }

    @Transactional
    public void verifyEmail(String email, String code) {
        String normalized = email.toLowerCase();
        User user = findUserOrThrow(normalized);
        consumeOtp(normalized, OtpPurpose.VERIFY_EMAIL, code);
        user.setEmailVerified(true);
    }

    // ---------- helpers ----------

    /** Current-profile projection used by GET /api/users/me and admin listings. */
    @Transactional(readOnly = true)
    public UserDto me(UUID userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        List<String> roleNames = user.getRoles().stream()
                .map(r -> r.getName().name()).distinct().sorted().toList();
        List<String> permissions = user.getRoles().stream()
                .flatMap(r -> r.getPermissions().stream())
                .map(Permission::getCode)
                .distinct().sorted().toList();
        UUID shopId = shopLookup.primaryShopIdForKeeper(user.getId());
        return toDto(user, roleNames, permissions, shopId);
    }

    /** Guests set their display name (shown to shopkeepers on queue tokens). */
    @Transactional
    public UserDto updateFullName(UUID userId, String fullName) {
        User user = users.findById(userId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        if (fullName.length() > 120) throw new ApiException(ErrorCode.VALIDATION_FAILED, "Name is too long");
        user.setFullName(fullName);
        users.save(user);
        return me(userId);
    }

    private void requireActive(User user) {
        if (!user.isActive()) {
            boolean suspended = user.getStatus() == UserStatus.SUSPENDED;
            throw new ApiException(
                    suspended ? ErrorCode.ACCOUNT_SUSPENDED : ErrorCode.ACCOUNT_INACTIVE,
                    suspended ? "This account has been suspended" : "This account is deactivated");
        }
    }

    private User findUserOrThrow(String identifier) {
        return users.findByEmailIgnoreCaseOrPhone(identifier, identifier)
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_CREDENTIALS,
                        "Invalid identifier or credentials"));
    }

    private AuthResponse issueAuthResponse(User user) {
        List<String> roleNames = user.getRoles().stream()
                .map(r -> r.getName().name()).distinct().sorted().toList();
        List<String> permissions = user.getRoles().stream()
                .flatMap(r -> r.getPermissions().stream())
                .map(Permission::getCode)
                .distinct().sorted().toList();
        UUID shopId = shopLookup.primaryShopIdForKeeper(user.getId());

        String accessToken = jwtService.issueAccessToken(
                user.getId(),
                roleNames.stream().map(r -> "ROLE_" + r).toList(),
                permissions,
                shopId);
        String refreshToken = createRefreshToken(user);

        return new AuthResponse(accessToken, refreshToken,
                jwtProperties.accessTokenValidityMinutes() * 60,
                toDto(user, roleNames, permissions, shopId));
    }

    private String createRefreshToken(User user) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String raw = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var token = new com.inko.identity.domain.RefreshToken();
        token.setUser(user);
        token.setTokenHash(sha256Hex(raw));
        token.setExpiresAt(Instant.now().plus(Duration.ofDays(jwtProperties.refreshTokenValidityDays())));
        refreshTokens.save(token);
        return raw;
    }

    private String issueOtp(String identifier, OtpPurpose purpose) {
        String code = "%06d".formatted(random.nextInt(1_000_000));
        var otp = new OtpCode();
        otp.setIdentifier(identifier);
        otp.setCodeHash(sha256Hex(code));
        otp.setPurpose(purpose);
        otp.setExpiresAt(Instant.now().plus(OTP_VALIDITY));
        otpCodes.save(otp);
        log.info("OTP issued for {} purpose={} (delivery mocked)", mask(identifier), purpose);
        return code;
    }

    private void consumeOtp(String identifier, OtpPurpose purpose, String code) {
        OtpCode otp = otpCodes.findLatestActive(identifier, purpose)
                .orElseThrow(() -> new ApiException(ErrorCode.OTP_INVALID,
                        "No active code was requested — request a new one"));
        if (!sha256Hex(code).equals(otp.getCodeHash())) {
            otp.registerFailedAttempt(OtpCode.MAX_ATTEMPTS);
            throw new ApiException(ErrorCode.OTP_INVALID, "Incorrect code");
        }
        otp.consume();
    }

    private static UserDto toDto(User user, List<String> roles, List<String> perms, UUID shopId) {
        return new UserDto(user.getId(), user.getFullName(), user.getEmail(), user.getPhone(),
                roles, perms, user.getStatus(), user.isEmailVerified(), user.isPhoneVerified(), shopId);
    }

    private Role role(RoleName name) {
        return roles.findByName(name)
                .orElseThrow(() -> new IllegalStateException("Role missing from seed data: " + name));
    }

    static String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String mask(String identifier) {
        return identifier.length() <= 4 ? "***" : identifier.substring(0, 2) + "***"
                + identifier.substring(identifier.length() - 2);
    }

    /** Minimal seam so identity does not depend on the full shops module yet. */
    public interface ShopLookup {
        UUID primaryShopIdForKeeper(UUID keeperUserId);
    }
}
