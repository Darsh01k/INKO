package com.inko.tokens.repo;

import com.inko.tokens.domain.Token;
import com.inko.tokens.domain.TokenStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TokenRepository extends JpaRepository<Token, UUID> {
    List<Token> findByShopIdAndTokenDateOrderByIssuedAtAsc(UUID shopId, LocalDate date);
    List<Token> findByShopIdAndStatusIn(UUID shopId, List<TokenStatus> statuses);
    Optional<Token> findByOrderId(UUID orderId);
    long countByShopIdAndTokenDateAndStatusIn(UUID shopId, LocalDate date, List<TokenStatus> statuses);
    @Query("select t from Token t where t.shopId = :shopId and t.tokenDate = :date and t.status in :statuses order by t.priority asc, t.issuedAt asc")
    List<Token> findQueue(UUID shopId, LocalDate date, List<TokenStatus> statuses);
}
