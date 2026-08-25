package com.inko.pricing.service;

import com.inko.common.error.ApiException;
import com.inko.common.error.ErrorCode;
import com.inko.pricing.domain.Coupon;
import com.inko.pricing.domain.DiscountRule;
import com.inko.pricing.domain.DiscountType;
import com.inko.pricing.domain.RuleScope;
import com.inko.pricing.repo.CouponRepository;
import com.inko.pricing.repo.DiscountRuleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class DiscountAdminService {

    private final DiscountRuleRepository discounts;
    private final CouponRepository coupons;

    public DiscountAdminService(DiscountRuleRepository discounts, CouponRepository coupons) {
        this.discounts = discounts;
        this.coupons = coupons;
    }

    @Transactional(readOnly = true)
    public List<DiscountRule> list(RuleScope scope, UUID shopId) {
        if (scope == RuleScope.SHOP && shopId != null) return discounts.findByScopeAndShopId(RuleScope.SHOP, shopId);
        if (scope == RuleScope.PLATFORM) return discounts.findByScope(RuleScope.PLATFORM);
        return discounts.findAll();
    }

    @Transactional
    public DiscountRule create(DiscountRule dr) {
        validate(dr);
        return discounts.save(dr);
    }

    @Transactional
    public DiscountRule update(UUID id, DiscountRule patch) {
        DiscountRule ex = discounts.findById(id).orElseThrow(() -> ApiException.notFound("Discount rule not found"));
        ex.setName(patch.getName());
        ex.setScope(patch.getScope());
        ex.setShopId(patch.getShopId());
        ex.setType(patch.getType());
        ex.setValue(patch.getValue());
        ex.setMaxDiscountAmount(patch.getMaxDiscountAmount());
        ex.setMinOrderAmount(patch.getMinOrderAmount());
        ex.setMinPages(patch.getMinPages());
        ex.setStartsAt(patch.getStartsAt());
        ex.setEndsAt(patch.getEndsAt());
        ex.setUsageLimitTotal(patch.getUsageLimitTotal());
        ex.setUsageLimitPerUser(patch.getUsageLimitPerUser());
        ex.setActive(patch.isActive());
        validate(ex);
        return discounts.save(ex);
    }

    @Transactional
    public void delete(UUID id) {
        if (!discounts.existsById(id)) throw ApiException.notFound("Discount rule not found");
        discounts.deleteById(id);
    }

    @Transactional
    public Coupon createCoupon(UUID discountRuleId, String code) {
        DiscountRule dr = discounts.findById(discountRuleId).orElseThrow(() -> ApiException.notFound("Discount rule not found"));
        String upper = code == null ? null : code.trim().toUpperCase();
        if (upper == null || upper.isBlank()) throw new ApiException(ErrorCode.VALIDATION_FAILED, "coupon code required");
        if (coupons.existsByCodeIgnoreCase(upper)) throw new ApiException(ErrorCode.CONFLICT, "Coupon code already exists");
        if (coupons.findByDiscountRuleId(discountRuleId).isPresent())
            throw new ApiException(ErrorCode.CONFLICT, "Discount rule already has a coupon");
        Coupon c = new Coupon();
        c.setDiscountRuleId(dr.getId());
        c.setCode(upper);
        c.setValidFrom(dr.getStartsAt());
        c.setValidTo(dr.getEndsAt());
        return coupons.save(c);
    }

    @Transactional(readOnly = true)
    public List<Coupon> listCoupons() { return coupons.findAll(); }

    private void validate(DiscountRule r) {
        if (r.getName() == null || r.getName().isBlank())
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "name is required");
        if (r.getType() == null) throw new ApiException(ErrorCode.VALIDATION_FAILED, "type is required");
        if (r.getValue() == null || r.getValue().compareTo(BigDecimal.ZERO) <= 0)
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "value must be > 0");
        if (r.getType() == DiscountType.PERCENTAGE && r.getValue().compareTo(BigDecimal.valueOf(100)) > 0)
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "percentage cannot exceed 100");
        if (r.getEndsAt() != null && r.getStartsAt() != null && r.getEndsAt().isBefore(r.getStartsAt()))
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "endsAt must be >= startsAt");
        if (r.getScope() == RuleScope.PLATFORM && r.getShopId() != null)
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "PLATFORM discount must not have shopId");
        if (r.getScope() == RuleScope.SHOP && r.getShopId() == null)
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "SHOP discount must have shopId");
        if (r.getMaxDiscountAmount() != null && r.getMaxDiscountAmount().compareTo(BigDecimal.ZERO) <= 0)
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "maxDiscountAmount must be > 0");
    }
}
