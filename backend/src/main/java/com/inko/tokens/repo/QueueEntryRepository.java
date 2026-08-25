package com.inko.tokens.repo;

import com.inko.tokens.domain.QueueEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QueueEntryRepository extends JpaRepository<QueueEntry, UUID> {
    Optional<QueueEntry> findByTokenId(UUID tokenId);
    List<QueueEntry> findByShopIdAndStatusOrderByPositionAsc(UUID shopId, String status);
    List<QueueEntry> findByShopIdOrderByPositionAsc(UUID shopId);
}
