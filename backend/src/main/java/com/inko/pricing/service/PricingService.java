package com.inko.pricing.service;

import com.inko.common.error.ApiException;
import com.inko.common.error.ErrorCode;
import com.inko.pricing.domain.*;
import com.inko.pricing.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class PricingService {

    private final PricingRuleRepository pricingRules;
    private final DiscountRuleRepository discountRules;
    private final CouponRepository coupons;
    private final CouponRedemptionRepository redemptions;
    private final SystemSettingsService settings;

    public PricingService(PricingRuleRepository pricingRules,
                          DiscountRuleRepository discountRules,
                          CouponRepository coupons,
                          CouponRedemptionRepository redemptions,
                          SystemSettingsService settings) {
        this.pricingRules = pricingRules;
        this.discountRules = discountRules;
        this.coupons = coupons;
        this.redemptions = redemptions;
        this.settings = settings;
    }

    @Transactional(readOnly = true)
    public PriceBreakdown quote(PricingRequest req) {
        if (req.pages() <= 0) throw new ApiException(ErrorCode.VALIDATION_FAILED, "pages must be > 0");
        if (req.copies() <= 0) throw new ApiException(ErrorCode.VALIDATION_FAILED, "copies must be > 0");

        LocalDate today = LocalDate.now();
        PricingRule rule = pricingRules.findResolved(req.shopId(), req.paperSize(), req.colorMode(), req.sidesMode(), today)
                .orElseThrow(() -> new ApiException(ErrorCode.PRICING_NOT_CONFIGURED,
                        "No pricing configured for " + req.paperSize() + "/" + req.colorMode() + "/" + req.sidesMode()));

        BigDecimal unitPrice = rule.getPricePerPage();
        int printedPages = req.pages() * req.copies();
        int sheetsPerCopy = req.sidesMode() == SidesMode.DOUBLE ? (req.pages() + 1) / 2 : req.pages();
        int sheets = sheetsPerCopy * req.copies();

        BigDecimal subtotal = unitPrice.multiply(BigDecimal.valueOf(printedPages)).setScale(2, RoundingMode.HALF_UP);

        BigDecimal specialCharge = BigDecimal.ZERO;
        if (req.specialPaper()) {
            BigDecimal spc = rule.getSpecialPaperCharge() == null ? BigDecimal.ZERO : rule.getSpecialPaperCharge();
            specialCharge = spc.multiply(BigDecimal.valueOf(sheets)).setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal chargeBase = subtotal.add(specialCharge);

        BigDecimal[] attribution = decompose(rule, req, today, subtotal, sheets, printedPages);
        BigDecimal paperCharge = attribution[0];
        BigDecimal colorCharge = attribution[1];
        BigDecimal sideCharge = attribution[2];

        DiscountResult discount = resolveDiscount(req, chargeBase, today);

        BigDecimal afterDiscount = chargeBase.subtract(discount.amount()).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

        BigDecimal taxPercent = settings.decimal("tax.percent", BigDecimal.ZERO);
        BigDecimal taxAmount = afterDiscount.multiply(taxPercent).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        BigDecimal finalAmount = afterDiscount.add(taxAmount).setScale(2, RoundingMode.HALF_UP);
        if (rule.getMinOrderAmount() != null && finalAmount.compareTo(rule.getMinOrderAmount()) < 0) {
            finalAmount = rule.getMinOrderAmount().setScale(2, RoundingMode.HALF_UP);
            taxAmount = finalAmount.subtract(afterDiscount).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        }

        String currency = settings.string("platform.currency", "INR");

        return new PriceBreakdown(
                unitPrice, req.pages(), req.copies(), sheets, printedPages,
                subtotal, paperCharge, colorCharge, sideCharge, specialCharge,
                discount.amount(), discount.ruleId(), discount.couponId(),
                taxAmount, taxPercent, finalAmount, currency, rule.getId()
        );
    }

    private BigDecimal[] decompose(PricingRule rule, PricingRequest req, LocalDate today,
                                   BigDecimal subtotal, int sheets, int printedPages) {
        BigDecimal baseline = pricingRules.findResolved(req.shopId(), req.paperSize(), ColorMode.BW, SidesMode.SINGLE, today)
                .map(PricingRule::getPricePerPage)
                .orElse(rule.getPricePerPage());

        BigDecimal paperCharge = baseline.multiply(BigDecimal.valueOf(sheets)).setScale(2, RoundingMode.HALF_UP);
        if (paperCharge.compareTo(subtotal) > 0) paperCharge = subtotal;

        BigDecimal remainder = subtotal.subtract(paperCharge).max(BigDecimal.ZERO);

        BigDecimal colorCharge = BigDecimal.ZERO;
        BigDecimal sideCharge = BigDecimal.ZERO;

        boolean isColor = req.colorMode() == ColorMode.COLOR;
        boolean isDouble = req.sidesMode() == SidesMode.DOUBLE;

        if (isColor && isDouble) {
            colorCharge = remainder.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
            sideCharge = remainder.subtract(colorCharge).setScale(2, RoundingMode.HALF_UP);
        } else if (isColor) {
            colorCharge = remainder;
        } else if (isDouble) {
            sideCharge = remainder;
        }

        if (paperCharge.add(colorCharge).add(sideCharge).compareTo(subtotal) != 0) {
            BigDecimal sum = paperCharge.add(colorCharge).add(sideCharge);
            BigDecimal diff = subtotal.subtract(sum);
            if (isColor) colorCharge = colorCharge.add(diff).setScale(2, RoundingMode.HALF_UP);
            else if (isDouble) sideCharge = sideCharge.add(diff).setScale(2, RoundingMode.HALF_UP);
            else paperCharge = paperCharge.add(diff).setScale(2, RoundingMode.HALF_UP);
        }
        return new BigDecimal[]{paperCharge, colorCharge, sideCharge};
    }

    private DiscountResult resolveDiscount(PricingRequest req, BigDecimal chargeBase, LocalDate today) {
        Instant now = Instant.now();
        String code = req.couponCode() == null ? null : req.couponCode().trim();

        if (code != null && !code.isEmpty()) {
            Coupon coupon = coupons.findByCodeIgnoreCase(code)
                    .orElseThrow(() -> new ApiException(ErrorCode.COUPON_INVALID, "Invalid coupon code"));
            if (coupon.getValidFrom() != null && now.isBefore(coupon.getValidFrom()))
                throw new ApiException(ErrorCode.COUPON_INVALID, "Coupon not yet valid");
            if (coupon.getValidTo() != null && now.isAfter(coupon.getValidTo()))
                throw new ApiException(ErrorCode.COUPON_EXPIRED, "Coupon expired");

            DiscountRule dr = discountRules.findById(coupon.getDiscountRuleId())
                    .orElseThrow(() -> new ApiException(ErrorCode.COUPON_INVALID, "Coupon has no discount rule"));
            validateDiscountRule(dr, req, chargeBase, now, coupon.getId(), req.userId());
            BigDecimal amt = computeDiscountAmount(dr, chargeBase);
            return new DiscountResult(amt, dr.getId(), coupon.getId());
        }

        List<DiscountRule> candidates = discountRules.findActiveForShop(req.shopId(), now);
        DiscountRule best = null;
        BigDecimal bestAmt = BigDecimal.ZERO;
        for (DiscountRule dr : candidates) {
            if (!isDiscountEligible(dr, req, chargeBase, now, req.userId())) continue;
            BigDecimal amt = computeDiscountAmount(dr, chargeBase);
            if (amt.compareTo(bestAmt) > 0) { bestAmt = amt; best = dr; }
        }
        if (best == null) return new DiscountResult(BigDecimal.ZERO, null, null);
        return new DiscountResult(bestAmt, best.getId(), null);
    }

    private void validateDiscountRule(DiscountRule dr, PricingRequest req, BigDecimal chargeBase,
                                      Instant now, UUID couponId, UUID userId) {
        if (!dr.isActive()) throw new ApiException(ErrorCode.COUPON_INVALID, "Discount is inactive");
        if (dr.getStartsAt() != null && now.isBefore(dr.getStartsAt()))
            throw new ApiException(ErrorCode.COUPON_INVALID, "Discount not yet active");
        if (dr.getEndsAt() != null && now.isAfter(dr.getEndsAt()))
            throw new ApiException(ErrorCode.COUPON_EXPIRED, "Discount expired");
        if (dr.getScope() == RuleScope.SHOP && !dr.getShopId().equals(req.shopId()))
            throw new ApiException(ErrorCode.COUPON_INVALID, "Coupon not valid for this shop");
        if (dr.getMinOrderAmount() != null && chargeBase.compareTo(dr.getMinOrderAmount()) < 0)
            throw new ApiException(ErrorCode.DISCOUNT_NOT_APPLICABLE, "Order amount below discount minimum");
        if (dr.getMinPages() != null && (req.pages() * req.copies()) < dr.getMinPages())
            throw new ApiException(ErrorCode.DISCOUNT_NOT_APPLICABLE, "Not enough pages for this discount");
        if (dr.getUsageLimitTotal() != null && dr.getTimesUsed() >= dr.getUsageLimitTotal())
            throw new ApiException(ErrorCode.COUPON_LIMIT_REACHED, "Discount usage limit reached");
        if (couponId != null && dr.getUsageLimitPerUser() != null && userId != null) {
            long used = redemptions.countByCouponIdAndUserId(couponId, userId);
            if (used >= dr.getUsageLimitPerUser())
                throw new ApiException(ErrorCode.COUPON_LIMIT_REACHED, "Per-user coupon limit reached");
        }
        if (couponId == null && dr.getUsageLimitTotal() != null && dr.getTimesUsed() >= dr.getUsageLimitTotal())
            throw new ApiException(ErrorCode.COUPON_LIMIT_REACHED, "Discount usage limit reached");
        if (couponId != null) {
            long totalUsed = redemptions.countByCouponId(couponId);
            if (dr.getUsageLimitTotal() != null && totalUsed >= dr.getUsageLimitTotal())
                throw new ApiException(ErrorCode.COUPON_LIMIT_REACHED, "Coupon usage limit reached");
        }
    }

    private boolean isDiscountEligible(DiscountRule dr, PricingRequest req, BigDecimal chargeBase, Instant now, UUID userId) {
        try { validateDiscountRule(dr, req, chargeBase, now, null, userId); return true; }
        catch (ApiException e) { return false; }
    }

    private BigDecimal computeDiscountAmount(DiscountRule dr, BigDecimal chargeBase) {
        BigDecimal amt;
        if (dr.getType() == DiscountType.PERCENTAGE) {
            amt = chargeBase.multiply(dr.getValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        } else {
            amt = dr.getValue().setScale(2, RoundingMode.HALF_UP);
        }
        if (dr.getMaxDiscountAmount() != null && amt.compareTo(dr.getMaxDiscountAmount()) > 0)
            amt = dr.getMaxDiscountAmount().setScale(2, RoundingMode.HALF_UP);
        if (amt.compareTo(chargeBase) > 0) amt = chargeBase;
        return amt.setScale(2, RoundingMode.HALF_UP);
    }

    private int printedPages(PricingRequest req) { return req.pages() * req.copies(); }

    private record DiscountResult(BigDecimal amount, UUID ruleId, UUID couponId) {}
}
