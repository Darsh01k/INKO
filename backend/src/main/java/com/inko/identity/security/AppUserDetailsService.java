package com.inko.identity.security;

import com.inko.identity.domain.Permission;
import com.inko.identity.domain.Role;
import com.inko.identity.domain.User;
import com.inko.identity.domain.UserStatus;
import com.inko.identity.repo.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Loads the user from the database on every request so that role changes and
 * account suspension take effect immediately, regardless of token claims.
 */
@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public AppUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String subject) throws UsernameNotFoundException {
        UUID userId;
        try {
            userId = UUID.fromString(subject);
        } catch (IllegalArgumentException e) {
            throw new UsernameNotFoundException("Invalid subject");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new UsernameNotFoundException("Account is not active");
        }
        return new InkoPrincipal(user);
    }

    public static final class InkoPrincipal extends org.springframework.security.core.userdetails.User {

        private final transient User user;

        public InkoPrincipal(User user) {
            super(
                    user.getId().toString(),
                    user.getPasswordHash() == null ? "" : user.getPasswordHash(),
                    true,
                    true,
                    true,
                    true,
                    authoritiesOf(user));
            this.user = user;
        }

        public User domainUser() {
            return user;
        }

        public UUID userId() {
            return user.getId();
        }

        public UUID shopId() {
            return null;
        }

        private static List<org.springframework.security.core.GrantedAuthority> authoritiesOf(User u) {
            List<org.springframework.security.core.GrantedAuthority> out = new ArrayList<>();
            for (Role role : u.getRoles()) {
                out.add(new org.springframework.security.core.authority.SimpleGrantedAuthority(
                        "ROLE_" + role.getName().name()));
                for (Permission permission : role.getPermissions()) {
                    out.add(new org.springframework.security.core.authority.SimpleGrantedAuthority(
                            permission.getCode()));
                }
            }
            return out;
        }
    }
}
