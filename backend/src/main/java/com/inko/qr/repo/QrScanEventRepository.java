package com.inko.qr.repo;

import com.inko.qr.domain.QrScanEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface QrScanEventRepository extends JpaRepository<QrScanEvent, UUID> {
    List<QrScanEvent> findByQrIdOrderByScannedAtDesc(UUID qrId);

    @Query(value = """
            SELECT e.* FROM qr_scan_events e
            JOIN qr_codes q ON q.id = e.qr_id
            WHERE q.shop_id = :shopId
            ORDER BY e.scanned_at DESC
            LIMIT 100
            """, nativeQuery = true)
    List<QrScanEvent> findRecentByShop(@Param("shopId") UUID shopId);
}
