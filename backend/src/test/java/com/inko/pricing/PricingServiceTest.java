package com.inko.pricing;

import com.inko.pricing.domain.*;
import com.inko.pricing.repo.*;
import com.inko.pricing.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

class PricingServiceTest {

    PricingRuleRepository pricingRules;
    DiscountRuleRepository discountRules;
    CouponRepository coupons;
    CouponRedemptionRepository redemptions;
    SystemSettingsService settings;
    PricingService svc;

    UUID shopId = UUID.randomUUID();

    @BeforeEach
    void setup() {
        pricingRules = Mockito.mock(PricingRuleRepository.class);
        discountRules = Mockito.mock(DiscountRuleRepository.class);
        coupons = Mockito.mock(CouponRepository.class);
        redemptions = Mockito.mock(CouponRedemptionRepository.class);
        settings = Mockito.mock(SystemSettingsService.class);
        when(settings.decimal(eq("tax.percent"), any())).thenReturn(BigDecimal.ZERO);
        when(settings.string(eq("platform.currency"), any())).thenReturn("INR");
        when(settings.decimal(eq("pricing.min_a4_bw_per_page"), any())).thenReturn(null);
        when(settings.decimal(eq("pricing.max_a4_bw_per_page"), any())).thenReturn(null);
        svc = new PricingService(pricingRules, discountRules, coupons, redemptions, settings);
    }

    private PricingRule rule(PaperSize ps, ColorMode cm, SidesMode sm, String price) {
        PricingRule r = new PricingRule();
        r.setScope(RuleScope.PLATFORM);
        r.setPaperSize(ps); r.setColorMode(cm); r.setSidesMode(sm);
        r.setPricePerPage(new BigDecimal(price));
        r.setSpecialPaperCharge(BigDecimal.ZERO);
        r.setEffectiveFrom(LocalDate.now().minusDays(1));
        r.setActive(true);
        return r;
    }

    @Test
    void basicQuoteSubtotal() {
        PricingRule r = rule(PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, "2.00");
        when(pricingRules.findResolved(eq(shopId), eq(PaperSize.A4), eq(ColorMode.BW), eq(SidesMode.SINGLE), any())).thenReturn(Optional.of(r));
        when(pricingRules.findResolved(eq(shopId), eq(PaperSize.A4), eq(ColorMode.BW), eq(SidesMode.SINGLE), any())).thenReturn(Optional.of(r));
        when(discountRules.findActiveForShop(any(), any())).thenReturn(List.of());

        PricingRequest req = new PricingRequest(shopId, PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, 10, 2, false, null, UUID.randomUUID());
        var bd = svc.quote(req);
        assertEquals(new BigDecimal("40.00"), bd.subtotal());
        assertEquals(new BigDecimal("40.00"), bd.finalAmount());
        assertEquals(20, bd.printedPages());
        assertEquals(20, bd.sheets());
    }

    @Test
    void doubleSidedHalvesSheets() {
        PricingRule r = rule(PaperSize.A4, ColorMode.BW, SidesMode.DOUBLE, "2.00");
        PricingRule base = rule(PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, "2.00");
        when(pricingRules.findResolved(eq(shopId), eq(PaperSize.A4), eq(ColorMode.BW), eq(SidesMode.DOUBLE), any())).thenReturn(Optional.of(r));
        when(pricingRules.findResolved(eq(shopId), eq(PaperSize.A4), eq(ColorMode.BW), eq(SidesMode.SINGLE), any())).thenReturn(Optional.of(base));
        when(discountRules.findActiveForShop(any(), any())).thenReturn(List.of());

        PricingRequest req = new PricingRequest(shopId, PaperSize.A4, ColorMode.BW, SidesMode.DOUBLE, 5, 1, false, null, null);
        var bd = svc.quote(req);
        assertEquals(3, bd.sheets());
        assertEquals(new BigDecimal("10.00"), bd.subtotal());
    }

    @Test
    void shopFallbackToPlatform() {
        PricingRule platform = rule(PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, "1.50");
        when(pricingRules.findResolved(any(), any(), any(), any(), any())).thenReturn(Optional.of(platform));
        when(discountRules.findActiveForShop(any(), any())).thenReturn(List.of());
        var bd = svc.quote(new PricingRequest(shopId, PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, 2, 1, false, null, null));
        assertEquals(new BigDecimal("3.00"), bd.subtotal());
    }

    @Test
    void missingPricingThrows() {
        when(pricingRules.findResolved(any(), any(), any(), any(), any())).thenReturn(Optional.empty());
        assertThrows(Exception.class, () -> svc.quote(new PricingRequest(shopId, PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, 1, 1, false, null, null)));
    }

    @Test
    void specialPaperChargeAdded() {
        PricingRule r = rule(PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, "2.00");
        r.setSpecialPaperCharge(new BigDecimal("0.50"));
        when(pricingRules.findResolved(any(), any(), any(), any(), any())).thenReturn(Optional.of(r));
        when(discountRules.findActiveForShop(any(), any())).thenReturn(List.of());
        var bd = svc.quote(new PricingRequest(shopId, PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, 4, 1, true, null, null));
        assertEquals(new BigDecimal("8.00"), bd.subtotal());
        assertEquals(new BigDecimal("2.00"), bd.specialPaperCharge());
        assertEquals(new BigDecimal("10.00"), bd.finalAmount());
    }

    @Test
    void percentageDiscountApplied() {
        PricingRule r = rule(PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, "10.00");
        when(pricingRules.findResolved(any(), any(), any(), any(), any())).thenReturn(Optional.of(r));
        DiscountRule dr = new DiscountRule();
        dr.setName("10% off"); dr.setScope(RuleScope.PLATFORM); dr.setType(DiscountType.PERCENTAGE);
        dr.setValue(new BigDecimal("10")); dr.setActive(true); dr.setStartsAt(Instant.now().minusSeconds(3600));
        when(discountRules.findActiveForShop(any(), any())).thenReturn(List.of(dr));
        var bd = svc.quote(new PricingRequest(shopId, PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, 10, 1, false, null, null));
        assertEquals(new BigDecimal("100.00"), bd.subtotal());
        assertEquals(new BigDecimal("10.00"), bd.discountAmount());
        assertEquals(new BigDecimal("90.00"), bd.finalAmount());
    }

    @Test
    void fixedDiscountCapByMax() {
        PricingRule r = rule(PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, "10.00");
        when(pricingRules.findResolved(any(), any(), any(), any(), any())).thenReturn(Optional.of(r));
        DiscountRule dr = new DiscountRule();
        dr.setName("flat 50 max 20"); dr.setScope(RuleScope.PLATFORM); dr.setType(DiscountType.FIXED);
        dr.setValue(new BigDecimal("50")); dr.setMaxDiscountAmount(new BigDecimal("20")); dr.setActive(true); dr.setStartsAt(Instant.now().minusSeconds(3600));
        when(discountRules.findActiveForShop(any(), any())).thenReturn(List.of(dr));
        var bd = svc.quote(new PricingRequest(shopId, PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, 5, 1, false, null, null));
        assertEquals(new BigDecimal("20.00"), bd.discountAmount());
    }

    @Test
    void couponValidationInvalidCode() {
        PricingRule r = rule(PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, "2.00");
        when(pricingRules.findResolved(any(), any(), any(), any(), any())).thenReturn(Optional.of(r));
        when(coupons.findByCodeIgnoreCase("BAD")).thenReturn(Optional.empty());
        assertThrows(Exception.class, () -> svc.quote(new PricingRequest(shopId, PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, 2, 1, false, "BAD", UUID.randomUUID())));
    }

    @Test
    void couponSuccessFlow() {
        PricingRule r = rule(PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, "10.00");
        when(pricingRules.findResolved(any(), any(), any(), any(), any())).thenReturn(Optional.of(r));
        DiscountRule dr = new DiscountRule();
        dr.setScope(RuleScope.PLATFORM); dr.setType(DiscountType.PERCENTAGE); dr.setValue(new BigDecimal("20")); dr.setActive(true); dr.setStartsAt(Instant.now().minusSeconds(3600));
        Coupon c = new Coupon(); c.setCode("SAVE20"); c.setDiscountRuleId(dr.getId()); c.setValidFrom(Instant.now().minusSeconds(3600));
        when(coupons.findByCodeIgnoreCase("SAVE20")).thenReturn(Optional.of(c));
        when(discountRules.findById(any())).thenReturn(Optional.of(dr));
        when(redemptions.countByCouponIdAndUserId(any(), any())).thenReturn(0L);
        when(redemptions.countByCouponId(any())).thenReturn(0L);
        var bd = svc.quote(new PricingRequest(shopId, PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, 5, 1, false, "SAVE20", UUID.randomUUID()));
        assertEquals(new BigDecimal("10.00"), bd.discountAmount());
    }

    @Test
    void taxApplied() {
        PricingRule r = rule(PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, "100.00");
        when(pricingRules.findResolved(any(), any(), any(), any(), any())).thenReturn(Optional.of(r));
        when(discountRules.findActiveForShop(any(), any())).thenReturn(List.of());
        when(settings.decimal(eq("tax.percent"), any())).thenReturn(new BigDecimal("18"));
        var bd = svc.quote(new PricingRequest(shopId, PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, 1, 1, false, null, null));
        assertEquals(new BigDecimal("18.00"), bd.taxAmount());
        assertEquals(new BigDecimal("118.00"), bd.finalAmount());
    }

    @Test
    void breakdownSumsToSubtotal() {
        PricingRule r = rule(PaperSize.A4, ColorMode.COLOR, SidesMode.DOUBLE, "5.00");
        PricingRule base = rule(PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, "2.00");
        when(pricingRules.findResolved(eq(shopId), eq(PaperSize.A4), eq(ColorMode.COLOR), eq(SidesMode.DOUBLE), any())).thenReturn(Optional.of(r));
        when(pricingRules.findResolved(eq(shopId), eq(PaperSize.A4), eq(ColorMode.BW), eq(SidesMode.SINGLE), any())).thenReturn(Optional.of(base));
        when(discountRules.findActiveForShop(any(), any())).thenReturn(List.of());
        var bd = svc.quote(new PricingRequest(shopId, PaperSize.A4, ColorMode.COLOR, SidesMode.DOUBLE, 4, 1, false, null, null));
        assertEquals(bd.subtotal(), bd.paperCharge().add(bd.colorCharge()).add(bd.sideCharge()));
    }

    @Test
    void bestDiscountWinsAmongMultiple() {
        PricingRule r = rule(PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, "10.00");
        when(pricingRules.findResolved(any(), any(), any(), any(), any())).thenReturn(Optional.of(r));
        DiscountRule small = new DiscountRule(); small.setName("5%"); small.setScope(RuleScope.PLATFORM); small.setType(DiscountType.PERCENTAGE); small.setValue(new BigDecimal("5")); small.setActive(true); small.setStartsAt(Instant.now().minusSeconds(3600));
        DiscountRule big = new DiscountRule(); big.setName("20%"); big.setScope(RuleScope.PLATFORM); big.setType(DiscountType.PERCENTAGE); big.setValue(new BigDecimal("20")); big.setActive(true); big.setStartsAt(Instant.now().minusSeconds(3600));
        when(discountRules.findActiveForShop(any(), any())).thenReturn(List.of(small, big));
        var bd = svc.quote(new PricingRequest(shopId, PaperSize.A4, ColorMode.BW, SidesMode.SINGLE, 10, 1, false, null, null));
        assertEquals(new BigDecimal("20.00"), bd.discountAmount());
    }
}
