package com.inko.qr.repo;

import com.inko.qr.domain.QrCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QrCodeRepository extends JpaRepository<QrCode, UUID> {
    Optional<QrCode> findByCodeValue(String codeValue);
    List<QrCode> findByShopIdOrderByCreatedAtDesc(UUID shopId);
    Optional<QrCode> findFirstByShopIdAndStatusOrderByCreatedAtDesc(UUID shopId, String status);
}
