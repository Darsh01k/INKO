package com.inko.pricing.service;

import java.math.BigDecimal;
import java.util.UUID;

public record PriceBreakdown(
        BigDecimal unitPricePerPage,
        int pages,
        int copies,
        int sheets,
        int printedPages,
        BigDecimal subtotal,
        BigDecimal paperCharge,
        BigDecimal colorCharge,
        BigDecimal sideCharge,
        BigDecimal specialPaperCharge,
        BigDecimal discountAmount,
        UUID appliedDiscountRuleId,
        UUID appliedCouponId,
        BigDecimal taxAmount,
        BigDecimal taxPercent,
        BigDecimal finalAmount,
        String currency,
        UUID pricingRuleId
) {}
