package com.inko.identity.service;

import com.inko.audit.service.AuditService;
import com.inko.common.error.ApiException;
import com.inko.common.error.ErrorCode;
import com.inko.identity.domain.Permission;
import com.inko.identity.domain.Role;
import com.inko.identity.domain.RoleName;
import com.inko.identity.domain.User;
import com.inko.identity.repo.RoleRepository;
import com.inko.identity.repo.UserRepository;
import com.inko.identity.web.dto.AuthDtos.UpdateUserStatusRequest;
import com.inko.identity.web.dto.AuthDtos.UserDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.inko.identity.domain.UserStatus;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AdminUserService {

    private final UserRepository users;
    private final RoleRepository roles;
    private final AuditService audit;

    public AdminUserService(UserRepository users, RoleRepository roles, AuditService audit) {
        this.users = users;
        this.roles = roles;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public Page<UserDto> searchUsers(String query, int page, int size) {
        String q = query == null || query.isBlank() ? "" : query.trim();
        var result = q.isEmpty()
                ? users.findAll(PageRequest.of(page, Math.min(size, 100),
                        Sort.by(Sort.Direction.DESC, "createdAt")))
                : users.search(q, PageRequest.of(page, Math.min(size, 100)));
        return result.map(u -> new UserDto(
                u.getId(), u.getFullName(), u.getEmail(), u.getPhone(),
                u.getRoles().stream().map(r -> r.getName().name()).distinct().sorted().toList(),
                u.getRoles().stream().flatMap(r -> r.getPermissions().stream())
                        .map(Permission::getCode).distinct().sorted().toList(),
                u.getStatus(), u.isEmailVerified(), u.isPhoneVerified(), null));
    }

    /** Activate / deactivate / suspend any account (admin governance). */
    @Transactional
    public UserDto changeStatus(UUID actingAdminId, UUID targetUserId, UpdateUserStatusRequest request) {
        if (actingAdminId.equals(targetUserId)) {
            throw new ApiException(com.inko.common.error.ErrorCode.VALIDATION_FAILED,
                    "You cannot change the status of your own account");
        }
        User acting = users.findById(actingAdminId).orElseThrow(() -> ApiException.notFound("Acting user not found"));
        boolean actingSuper = acting.getRoles().stream().anyMatch(r -> r.getName() == RoleName.SUPER_ADMIN);
        User user = users.findById(targetUserId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        boolean targetSuper = user.getRoles().stream().anyMatch(r -> r.getName() == RoleName.SUPER_ADMIN);
        if (targetSuper && !actingSuper) throw new ApiException(ErrorCode.FORBIDDEN, "Only SUPER_ADMIN can change SUPER_ADMIN status");
        user.setStatus(request.status());
        users.save(user);
        audit.record(actingAdminId, "ADMIN", "USER_STATUS_CHANGED", "USER", targetUserId, "{\"status\":\"" + request.status() + "\"}");
        return toDto(user);
    }

    /** Replace a user's roles entirely — used to upgrade customers to SHOPKEEPER etc. */
    @Transactional
    public UserDto changeRoles(UUID actingAdminId, UUID targetUserId, List<String> roleNames) {
        if (actingAdminId.equals(targetUserId)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "You cannot change the roles of your own account");
        }
        if (roleNames == null || roleNames.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "At least one role is required");
        }
        User acting = users.findById(actingAdminId).orElseThrow(() -> ApiException.notFound("Acting user not found"));
        boolean actingSuper = acting.getRoles().stream().anyMatch(r -> r.getName() == RoleName.SUPER_ADMIN);
        if (roleNames.contains("SUPER_ADMIN") && !actingSuper) throw new ApiException(ErrorCode.FORBIDDEN, "Only SUPER_ADMIN can grant SUPER_ADMIN");
        User user = users.findById(targetUserId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        boolean targetSuper = user.getRoles().stream().anyMatch(r -> r.getName() == RoleName.SUPER_ADMIN);
        if (targetSuper && !actingSuper) throw new ApiException(ErrorCode.FORBIDDEN, "Only SUPER_ADMIN can modify SUPER_ADMIN");
        var next = roleNames.stream().distinct().map(name -> {
            try { return RoleName.valueOf(name); }
            catch (IllegalArgumentException e) { throw new ApiException(ErrorCode.VALIDATION_FAILED, "Unknown role: " + name); }
        }).toList();
        user.getRoles().clear();
        next.forEach(rn -> {
            Role role = roles.findByName(rn)
                    .orElseThrow(() -> ApiException.notFound("Role not seeded: " + rn));
            user.getRoles().add(role);
        });
        users.save(user);
        audit.record(actingAdminId, "ADMIN", "USER_ROLES_CHANGED", "USER", targetUserId,
                "{\"roles\":" + next.stream().map(Enum::name).toList() + "}");
        return toDto(user);
    }

    @Transactional(readOnly = true)
    public Map<String, Long> counts() {
        Map<String, Long> out = new LinkedHashMap<>();
        out.put("total", users.count());
        out.put("active", users.countByStatus(UserStatus.ACTIVE));
        return out;
    }

    private UserDto toDto(User u) {
        return new UserDto(
                u.getId(), u.getFullName(), u.getEmail(), u.getPhone(),
                u.getRoles().stream().map(r -> r.getName().name()).distinct().sorted().toList(),
                u.getRoles().stream().flatMap(r -> r.getPermissions().stream())
                        .map(Permission::getCode).distinct().sorted().toList(),
                u.getStatus(), u.isEmailVerified(), u.isPhoneVerified(), null);
    }
}
