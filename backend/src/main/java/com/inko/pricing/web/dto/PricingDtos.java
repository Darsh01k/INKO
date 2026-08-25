package com.inko.pricing.web.dto;

import com.inko.pricing.domain.*;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class PricingDtos {
    private PricingDtos() {}

    public record QuoteRequest(
            @NotNull UUID shopId,
            @NotNull PaperSize paperSize,
            @NotNull ColorMode colorMode,
            @NotNull SidesMode sidesMode,
            @Min(1) int pages,
            @Min(1) int copies,
            boolean specialPaper,
            String couponCode
    ) {}

    public record QuoteResponse(
            BigDecimal unitPricePerPage, int pages, int copies, int sheets, int printedPages,
            BigDecimal subtotal, BigDecimal paperCharge, BigDecimal colorCharge, BigDecimal sideCharge,
            BigDecimal specialPaperCharge, BigDecimal discountAmount, UUID appliedDiscountRuleId,
            UUID appliedCouponId, BigDecimal taxAmount, BigDecimal taxPercent, BigDecimal finalAmount,
            String currency, UUID pricingRuleId
    ) {}

    public record PricingRuleRequest(
            @NotNull RuleScope scope,
            UUID shopId,
            @NotNull PaperSize paperSize,
            @NotNull ColorMode colorMode,
            @NotNull SidesMode sidesMode,
            @NotNull @DecimalMin("0.00") BigDecimal pricePerPage,
            BigDecimal specialPaperCharge,
            BigDecimal minOrderAmount,
            @NotNull LocalDate effectiveFrom,
            LocalDate effectiveTo,
            Boolean active
    ) {}

    public record PricingRuleResponse(
            UUID id, RuleScope scope, UUID shopId, PaperSize paperSize, ColorMode colorMode,
            SidesMode sidesMode, BigDecimal pricePerPage, BigDecimal specialPaperCharge,
            BigDecimal minOrderAmount, LocalDate effectiveFrom, LocalDate effectiveTo,
            boolean active, Instant createdAt, Instant updatedAt
    ) {}

    public record DiscountRuleRequest(
            @NotBlank String name,
            @NotNull RuleScope scope,
            UUID shopId,
            @NotNull DiscountType type,
            @NotNull @DecimalMin("0.01") BigDecimal value,
            BigDecimal maxDiscountAmount,
            BigDecimal minOrderAmount,
            Integer minPages,
            Instant startsAt,
            Instant endsAt,
            Integer usageLimitTotal,
            Integer usageLimitPerUser,
            Boolean active
    ) {}

    public record DiscountRuleResponse(
            UUID id, String name, RuleScope scope, UUID shopId, DiscountType type, BigDecimal value,
            BigDecimal maxDiscountAmount, BigDecimal minOrderAmount, Integer minPages,
            Instant startsAt, Instant endsAt, Integer usageLimitTotal, Integer usageLimitPerUser,
            int timesUsed, boolean active, Instant createdAt, Instant updatedAt
    ) {}

    public record CouponRequest(@NotBlank String code) {}
    public record CouponResponse(UUID id, UUID discountRuleId, String code, Instant validFrom, Instant validTo, Instant createdAt) {}
}
