package com.inko.pricing.web;

import com.inko.identity.security.AppUserDetailsService.InkoPrincipal;
import com.inko.pricing.domain.PricingRule;
import com.inko.pricing.domain.RuleScope;
import com.inko.pricing.service.*;
import com.inko.pricing.web.dto.PricingDtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/pricing")
public class PricingController {

    private final PricingService pricingService;
    private final PricingAdminService adminService;
    private final com.inko.shops.repo.ShopRepository shops;

    public PricingController(PricingService pricingService, PricingAdminService adminService,
                             com.inko.shops.repo.ShopRepository shops) {
        this.pricingService = pricingService;
        this.adminService = adminService;
        this.shops = shops;
    }

    @PostMapping("/quote")
    public QuoteResponse quote(@AuthenticationPrincipal InkoPrincipal principal,
                               @Valid @RequestBody QuoteRequest req) {
        PricingRequest pr = new PricingRequest(req.shopId(), req.paperSize(), req.colorMode(),
                req.sidesMode(), req.pages(), req.copies(), req.specialPaper(), req.couponCode(),
                principal == null ? null : principal.userId());
        var bd = pricingService.quote(pr);
        return new QuoteResponse(bd.unitPricePerPage(), bd.pages(), bd.copies(), bd.sheets(), bd.printedPages(),
                bd.subtotal(), bd.paperCharge(), bd.colorCharge(), bd.sideCharge(), bd.specialPaperCharge(),
                bd.discountAmount(), bd.appliedDiscountRuleId(), bd.appliedCouponId(),
                bd.taxAmount(), bd.taxPercent(), bd.finalAmount(), bd.currency(), bd.pricingRuleId());
    }

    @GetMapping("/rules")
    public List<PricingRuleResponse> list(@AuthenticationPrincipal InkoPrincipal principal,
                                          @RequestParam(required = false) RuleScope scope,
                                          @RequestParam(required = false) UUID shopId) {
        if (shopId != null) enforceShopAccessOnRead(principal, shopId);
        return adminService.list(scope, shopId).stream().map(PricingController::toDto).toList();
    }

    @PostMapping("/rules")
    @ResponseStatus(HttpStatus.CREATED)
    public PricingRuleResponse create(@AuthenticationPrincipal InkoPrincipal principal,
                                      @Valid @RequestBody PricingRuleRequest req) {
        enforceShopAccess(principal, req.scope(), req.shopId());
        return toDto(adminService.create(toEntity(req)));
    }

    @PutMapping("/rules/{id}")
    public PricingRuleResponse update(@AuthenticationPrincipal InkoPrincipal principal,
                                      @PathVariable UUID id,
                                      @Valid @RequestBody PricingRuleRequest req) {
        enforceShopAccess(principal, req.scope(), req.shopId());
        return toDto(adminService.update(id, toEntity(req)));
    }

    @DeleteMapping("/rules/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal InkoPrincipal principal, @PathVariable UUID id) {
        if (principal != null) {
            var existing = adminService.list(null, null).stream().filter(r -> r.getId().equals(id)).findFirst();
            existing.ifPresent(r -> enforceShopAccess(principal, r.getScope(), r.getShopId()));
        }
        adminService.delete(id);
    }

    private void enforceShopAccess(InkoPrincipal p, RuleScope scope, UUID shopId) {
        if (p == null) throw com.inko.common.error.ApiException.forbidden("Authentication required");
        boolean isAdmin = p.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        if (isAdmin) return;
        boolean isKeeper = p.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SHOPKEEPER"));
        if (scope == RuleScope.PLATFORM)
            throw com.inko.common.error.ApiException.forbidden("Only admins can manage platform pricing");
        if (!isKeeper) throw com.inko.common.error.ApiException.forbidden("Insufficient permissions");
        if (shopId == null) throw com.inko.common.error.ApiException.forbidden("ShopId required");
        var shop = shops.findById(shopId).orElseThrow(() -> com.inko.common.error.ApiException.notFound("Shop not found"));
        if (!p.userId().equals(shop.getOwnerUserId()))
            throw com.inko.common.error.ApiException.forbidden("You do not manage this shop");
    }

    private void enforceShopAccessOnRead(InkoPrincipal principal, UUID shopId) {
        if (principal == null) return;
        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        if (isAdmin) return;
        boolean isKeeper = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SHOPKEEPER"));
        if (!isKeeper) return;
        var shop = shops.findById(shopId).orElse(null);
        if (shop != null && !principal.userId().equals(shop.getOwnerUserId())) {
            throw com.inko.common.error.ApiException.forbidden("You do not manage this shop");
        }
    }

    private static PricingRule toEntity(PricingRuleRequest r) {
        PricingRule e = new PricingRule();
        e.setScope(r.scope());
        e.setShopId(r.shopId());
        e.setPaperSize(r.paperSize());
        e.setColorMode(r.colorMode());
        e.setSidesMode(r.sidesMode());
        e.setPricePerPage(r.pricePerPage());
        e.setSpecialPaperCharge(r.specialPaperCharge());
        e.setMinOrderAmount(r.minOrderAmount());
        e.setEffectiveFrom(r.effectiveFrom());
        e.setEffectiveTo(r.effectiveTo());
        if (r.active() != null) e.setActive(r.active());
        return e;
    }

    static PricingRuleResponse toDto(PricingRule e) {
        return new PricingRuleResponse(e.getId(), e.getScope(), e.getShopId(), e.getPaperSize(),
                e.getColorMode(), e.getSidesMode(), e.getPricePerPage(), e.getSpecialPaperCharge(),
                e.getMinOrderAmount(), e.getEffectiveFrom(), e.getEffectiveTo(), e.isActive(),
                e.getCreatedAt(), e.getUpdatedAt());
    }
}
