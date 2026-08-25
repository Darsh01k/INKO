package com.inko.identity.repo;

import com.inko.identity.domain.User;
import com.inko.identity.domain.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByPhone(String phone);

    Optional<User> findByEmailIgnoreCaseOrPhone(String email, String phone);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByPhone(String phone);

    long countByStatus(UserStatus status);

    @Query("""
            SELECT u FROM User u
            WHERE lower(u.fullName) LIKE lower(concat('%', :q, '%'))
               OR lower(u.email)    LIKE lower(concat('%', :q, '%'))
               OR u.phone           LIKE concat('%', :q, '%')
            """)
    Page<User> search(@Param("q") String q, Pageable pageable);
}
