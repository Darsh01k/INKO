package com.inko.identity.web;

import com.inko.identity.security.AppUserDetailsService.InkoPrincipal;
import com.inko.identity.service.AdminUserService;
import com.inko.identity.web.dto.AuthDtos.UpdateUserStatusRequest;
import com.inko.identity.web.dto.AuthDtos.UserDto;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AdminUserService adminUsers;

    public AdminUserController(AdminUserService adminUsers) {
        this.adminUsers = adminUsers;
    }

    @GetMapping
    public Page<UserDto> list(@RequestParam(required = false) String query,
                              @RequestParam(defaultValue = "0") int page,
                              @RequestParam(defaultValue = "20") int size) {
        return adminUsers.searchUsers(query, page, size);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<UserDto> changeStatus(@AuthenticationPrincipal InkoPrincipal principal,
                                                @PathVariable UUID id,
                                                @Valid @RequestBody UpdateUserStatusRequest request) {
        return ResponseEntity.ok(adminUsers.changeStatus(principal.userId(), id, request));
    }

    @PatchMapping("/{id}/roles")
    public ResponseEntity<UserDto> changeRoles(@AuthenticationPrincipal InkoPrincipal principal,
                                               @PathVariable UUID id,
                                               @RequestBody Map<String, List<String>> body) {
        return ResponseEntity.ok(adminUsers.changeRoles(principal.userId(), id, body.get("roles")));
    }

    @GetMapping("/count")
    public Map<String, Long> count() {
        return adminUsers.counts();
    }
}
