package com.inko.catalog.repo;

import com.inko.catalog.domain.ShopPaperInventory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShopPaperInventoryRepository extends JpaRepository<ShopPaperInventory, UUID> {
    List<ShopPaperInventory> findByShopIdOrderByPaperSizeAscGsmAsc(UUID shopId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select s from ShopPaperInventory s where s.shopId = :shopId order by s.paperSize asc, s.gsm asc")
    List<ShopPaperInventory> findByShopIdForUpdate(UUID shopId);
    Optional<ShopPaperInventory> findByShopIdAndPaperSizeAndGsm(UUID shopId, String paperSize, Integer gsm);
}
