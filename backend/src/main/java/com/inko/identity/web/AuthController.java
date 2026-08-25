package com.inko.identity.web;

import com.inko.identity.service.AuthService;
import com.inko.identity.web.dto.AuthDtos.AuthResponse;
import com.inko.identity.web.dto.AuthDtos.ForgotPasswordRequest;
import com.inko.identity.web.dto.AuthDtos.LoginRequest;
import com.inko.identity.web.dto.AuthDtos.LogoutRequest;
import com.inko.identity.web.dto.AuthDtos.OtpIssueRequest;
import com.inko.identity.web.dto.AuthDtos.OtpIssueResponse;
import com.inko.identity.web.dto.AuthDtos.OtpVerifyRequest;
import com.inko.identity.web.dto.AuthDtos.RefreshRequest;
import com.inko.identity.web.dto.AuthDtos.RegisterRequest;
import com.inko.identity.web.dto.AuthDtos.ResetPasswordRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return auth.register(request.fullName(), request.email(), request.phone(), request.password(),
                request.accountType());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return auth.loginByIdentifierAndPassword(request.identifier(), request.password());
    }

    /** Guest checkout — no credentials required. Returns a real session for an ephemeral customer. */
    @PostMapping("/guest")
    public AuthResponse guest() {
        return auth.createGuestSession();
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return auth.refresh(request.refreshToken());
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(@Valid @RequestBody LogoutRequest request) {
        auth.logout(request.refreshToken());
        return Map.of("ok", true);
    }

    @PostMapping("/otp/request")
    public OtpIssueResponse requestOtp(@Valid @RequestBody OtpIssueRequest request) {
        return auth.requestLoginOtp(request.identifier());
    }

    @PostMapping("/otp/verify")
    public AuthResponse verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        return auth.verifyLoginOtp(request.identifier(), request.code());
    }

    @PostMapping("/forgot-password")
    public OtpIssueResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return auth.forgotPassword(request.email());
    }

    @PostMapping("/reset-password")
    public Map<String, Object> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        auth.resetPassword(request.identifier(), request.code(), request.newPassword());
        return Map.of("ok", true);
    }

    @PostMapping("/verify-email")
    public Map<String, Object> verifyEmail(@Valid @RequestBody com.inko.identity.web.dto.AuthDtos.OtpVerifyRequest request) {
        auth.verifyEmail(request.identifier(), request.code());
        return Map.of("ok", true);
    }
}
