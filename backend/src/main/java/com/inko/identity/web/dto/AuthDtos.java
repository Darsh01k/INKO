package com.inko.identity.web.dto;

import com.inko.identity.domain.UserStatus;
import jakarta.validation.constraints.*;

import java.util.List;
import java.util.UUID;

/**
 * Request/response contracts for authentication endpoints.
 */
public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Size(max = 120) String fullName,
            @Email @Size(max = 180) String email,
            @jakarta.validation.constraints.Pattern(regexp = "^\\+?[0-9]{8,15}$",
                    message = "must be a valid phone number")
            String phone,
            @NotBlank @Size(min = 8, max = 72, message
                    = "password must be between 8 and 72 characters") String password
    ) {
        public boolean hasIdentifier() {
            return (email != null && !email.isBlank()) || (phone != null && !phone.isBlank());
        }
    }

    public record LoginRequest(
            @NotBlank(message = "identifier is required") String identifier,
            @NotBlank String password
    ) {
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record LogoutRequest(@NotBlank String refreshToken) {
    }

    public record OtpIssueRequest(
            @NotBlank(message = "identifier is required") String identifier
    ) {
    }

    public record OtpVerifyRequest(
            @NotBlank String identifier,
            @NotBlank @jakarta.validation.constraints.Pattern(regexp = "^[0-9]{6}$",
                    message = "code must be 6 digits") String code
    ) {
    }

    public record ForgotPasswordRequest(@NotBlank @Email String email) {
    }

    public record ResetPasswordRequest(
            @NotBlank String identifier,
            @NotBlank @jakarta.validation.constraints.Pattern(regexp = "^[0-9]{6}$") String code,
            @NotBlank @Size(min = 8, max = 72) String newPassword
    ) {
    }

    public record UpdateUserStatusRequest(@NotNull UserStatus status) {
    }

    public record UserDto(
            UUID id,
            String fullName,
            String email,
            String phone,
            List<String> roles,
            List<String> permissions,
            UserStatus status,
            boolean emailVerified,
            boolean phoneVerified,
            UUID shopId
    ) {
    }

    public record AuthResponse(
            String accessToken,
            String refreshToken,
            long expiresInSeconds,
            UserDto user
    ) {
    }

    public record OtpIssueResponse(boolean delivered, String channel, String devCode) {
    }
}
