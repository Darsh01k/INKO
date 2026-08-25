package com.inko.identity.web;

import com.inko.common.error.ApiException;
import com.inko.identity.security.AppUserDetailsService.InkoPrincipal;
import com.inko.identity.service.AuthService;
import com.inko.identity.web.dto.AuthDtos.UserDto;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final AuthService auth;

    public UserController(AuthService auth) {
        this.auth = auth;
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal InkoPrincipal principal) {
        return auth.me(principal.userId());
    }

    /** Guests set their display name here so shops know whose print it is. */
    @PatchMapping("/me")
    public UserDto updateMe(@AuthenticationPrincipal InkoPrincipal principal,
                            @RequestBody Map<String, String> body) {
        String fullName = body.get("fullName");
        if (fullName == null || fullName.isBlank()) throw ApiException.notFound("fullName is required");
        return auth.updateFullName(principal.userId(), fullName.trim());
    }
}
