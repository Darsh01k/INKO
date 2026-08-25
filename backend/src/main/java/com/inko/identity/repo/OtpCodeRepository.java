package com.inko.identity.repo;

import com.inko.identity.domain.OtpCode;
import com.inko.identity.domain.OtpPurpose;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OtpCodeRepository extends JpaRepository<OtpCode, UUID> {

    @Query("""
            SELECT o FROM OtpCode o
            WHERE o.identifier = :identifier AND o.purpose = :purpose
              AND o.consumedAt IS NULL AND o.expiresAt > :now
            ORDER BY o.createdAt DESC
            """)
    List<OtpCode> findActive(@Param("identifier") String identifier,
                             @Param("purpose") OtpPurpose purpose,
                             @Param("now") Instant now,
                             Pageable pageable);

    default Optional<OtpCode> findLatestActive(String identifier, OtpPurpose purpose) {
        return findActive(identifier, purpose, Instant.now(), Pageable.ofSize(1))
                .stream().findFirst();
    }
}
