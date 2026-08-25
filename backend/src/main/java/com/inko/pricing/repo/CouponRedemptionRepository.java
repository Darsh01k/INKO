package com.inko.pricing.repo;

import com.inko.pricing.domain.CouponRedemption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CouponRedemptionRepository extends JpaRepository<CouponRedemption, UUID> {
    long countByCouponId(UUID couponId);
    long countByCouponIdAndUserId(UUID couponId, UUID userId);
}
