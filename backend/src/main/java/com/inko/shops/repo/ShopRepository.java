package com.inko.shops.repo;

import com.inko.shops.domain.Shop;
import com.inko.shops.domain.ShopStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShopRepository extends JpaRepository<Shop, UUID> {

    List<Shop> findByStatusIn(List<ShopStatus> statuses);

    Optional<Shop> findByName(String name);

    Optional<Shop> findFirstByOwnerUserIdOrderByNameAsc(UUID keeperUserId);

    List<Shop> findByOwnerUserIdOrderByNameAsc(UUID keeperUserId);

    boolean existsByOwnerUserIdAndId(UUID keeperUserId, UUID shopId);
}
