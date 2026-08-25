package com.inko.tokens.repo;

import com.inko.tokens.domain.TokenSequence;
import com.inko.tokens.domain.TokenSequenceId;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface TokenSequenceRepository extends JpaRepository<TokenSequence, TokenSequenceId> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from TokenSequence s where s.shopId = :shopId and s.seqDate = :date")
    Optional<TokenSequence> findForUpdate(UUID shopId, LocalDate date);
}
