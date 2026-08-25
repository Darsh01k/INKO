package com.inko.identity.security;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import javax.crypto.spec.SecretKeySpec;

/**
 * HS256 JWT issuing/verification for short-lived access tokens.
 * Claims: sub = user id, roles, perms, shopId (shopkeepers only).
 */
@Service
public class JwtService {

    private static final String CLAIM_ROLES = "roles";
    private static final String CLAIM_PERMS = "perms";
    private static final String CLAIM_SHOP_ID = "shopId";

    private final SecretKey key;
    private final MACSigner signer;
    private final MACVerifier verifier;
    private final long validityMinutes;

    public JwtService(JwtProperties properties) {
        byte[] secretBytes = properties.secret().getBytes(StandardCharsets.UTF_8);
        this.key = new SecretKeySpec(secretBytes, "HmacSHA256");
        try {
            this.signer = new MACSigner(secretBytes);
            this.verifier = new MACVerifier(secretBytes);
        } catch (JOSEException e) {
            throw new IllegalStateException("Unable to initialize JWT HMAC primitives", e);
        }
        this.validityMinutes = properties.accessTokenValidityMinutes();
    }

    public String issueAccessToken(UUID userId,
                                   List<String> roles,
                                   List<String> permissions,
                                   UUID shopId) {
        Instant now = Instant.now();
        Instant expiry = now.plus(validityMinutes, java.time.temporal.ChronoUnit.MINUTES);

        JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder()
                .subject(userId.toString())
                .jwtID(UUID.randomUUID().toString())
                .issueTime(Date.from(now))
                .expirationTime(Date.from(expiry))
                .claim(CLAIM_ROLES, roles)
                .claim(CLAIM_PERMS, permissions);
        if (shopId != null) {
            claims.claim(CLAIM_SHOP_ID, shopId.toString());
        }

        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.HS256)
                .type(com.nimbusds.jose.JOSEObjectType.JWT)
                .build();
        SignedJWT signed = new SignedJWT(header, claims.build());
        try {
            signed.sign(signer);
        } catch (JOSEException e) {
            throw new IllegalStateException("Unable to sign access token", e);
        }
        return signed.serialize();
    }

    /**
     * Verifies signature + expiry; returns the subject (user id) or throws io.jsonwebtoken style
     * {@link InvalidTokenException}.
     */
    public DecodedToken verify(String token) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            if (!jwt.verify(verifier)) {
                throw new InvalidTokenException("Token signature is invalid");
            }
            Date expiration = jwt.getJWTClaimsSet().getExpirationTime();
            if (expiration == null || expiration.toInstant().isBefore(Instant.now())) {
                throw new TokenExpiredException();
            }
            var claims = jwt.getJWTClaimsSet();
            UUID userId = UUID.fromString(claims.getSubject());
            List<String> roles = stringList(claims.getStringListClaim(CLAIM_ROLES));
            List<String> perms = stringList(claims.getStringListClaim(CLAIM_PERMS));
            String shopIdRaw = claims.getStringClaim(CLAIM_SHOP_ID);
            UUID shopId = shopIdRaw == null ? null : UUID.fromString(shopIdRaw);
            return new DecodedToken(userId, roles, perms, shopId);
        } catch (ParseException | IllegalArgumentException e) {
            throw new InvalidTokenException("Malformed token");
        } catch (JOSEException e) {
            throw new InvalidTokenException("Token verification failed");
        }
    }

    private List<String> stringList(List<String> raw) {
        return raw == null ? List.of() : List.copyOf(raw);
    }

    public record DecodedToken(UUID userId, List<String> roles, List<String> permissions, UUID shopId) {
    }

    public static class InvalidTokenException extends RuntimeException {
        public InvalidTokenException(String message) {
            super(message);
        }
    }

    public static class TokenExpiredException extends InvalidTokenException {
        public TokenExpiredException() {
            super("Token expired");
        }
    }
}
