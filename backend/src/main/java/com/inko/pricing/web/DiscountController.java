package com.inko.pricing.web;

import com.inko.pricing.domain.Coupon;
import com.inko.pricing.domain.DiscountRule;
import com.inko.pricing.domain.RuleScope;
import com.inko.pricing.service.DiscountAdminService;
import com.inko.pricing.web.dto.PricingDtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/discounts")
public class DiscountController {

    private final DiscountAdminService service;
    private final com.inko.shops.repo.ShopRepository shops;

    public DiscountController(DiscountAdminService service, com.inko.shops.repo.ShopRepository shops) {
        this.service = service; this.shops = shops;
    }

    @GetMapping
    public List<DiscountRuleResponse> list(@RequestParam(required = false) RuleScope scope,
                                           @RequestParam(required = false) UUID shopId) {
        return service.list(scope, shopId).stream().map(DiscountController::toDto).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DiscountRuleResponse create(@org.springframework.security.core.annotation.AuthenticationPrincipal com.inko.identity.security.AppUserDetailsService.InkoPrincipal p,
                                       @Valid @RequestBody DiscountRuleRequest req) {
        enforce(p, req.scope(), req.shopId());
        return toDto(service.create(toEntity(req)));
    }

    @PutMapping("/{id}")
    public DiscountRuleResponse update(@org.springframework.security.core.annotation.AuthenticationPrincipal com.inko.identity.security.AppUserDetailsService.InkoPrincipal p,
                                       @PathVariable UUID id, @Valid @RequestBody DiscountRuleRequest req) {
        enforce(p, req.scope(), req.shopId());
        return toDto(service.update(id, toEntity(req)));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@org.springframework.security.core.annotation.AuthenticationPrincipal com.inko.identity.security.AppUserDetailsService.InkoPrincipal p,
                       @PathVariable UUID id) {
        var ex = service.list(null, null).stream().filter(r -> r.getId().equals(id)).findFirst();
        ex.ifPresent(r -> enforce(p, r.getScope(), r.getShopId()));
        service.delete(id);
    }

    @PostMapping("/{id}/coupon")
    @ResponseStatus(HttpStatus.CREATED)
    public CouponResponse createCoupon(@org.springframework.security.core.annotation.AuthenticationPrincipal com.inko.identity.security.AppUserDetailsService.InkoPrincipal p,
                                       @PathVariable UUID id, @Valid @RequestBody CouponRequest req) {
        var ex = service.list(null, null).stream().filter(r -> r.getId().equals(id)).findFirst();
        ex.ifPresent(r -> enforce(p, r.getScope(), r.getShopId()));
        return toCouponDto(service.createCoupon(id, req.code()));
    }

    private void enforce(com.inko.identity.security.AppUserDetailsService.InkoPrincipal p, RuleScope scope, UUID shopId) {
        if (p == null) throw com.inko.common.error.ApiException.forbidden("Authentication required");
        boolean isAdmin = p.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        if (isAdmin) return;
        boolean isKeeper = p.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SHOPKEEPER"));
        if (scope == RuleScope.PLATFORM) throw com.inko.common.error.ApiException.forbidden("Only admins can manage platform discounts");
        if (!isKeeper) throw com.inko.common.error.ApiException.forbidden("Insufficient permissions");
        if (shopId == null) throw com.inko.common.error.ApiException.forbidden("ShopId required");
        var shop = shops.findById(shopId).orElseThrow(() -> com.inko.common.error.ApiException.notFound("Shop not found"));
        if (!p.userId().equals(shop.getOwnerUserId())) throw com.inko.common.error.ApiException.forbidden("You do not manage this shop");
    }

    @GetMapping("/coupons")
    public List<CouponResponse> coupons() {
        return service.listCoupons().stream().map(DiscountController::toCouponDto).toList();
    }

    private static DiscountRule toEntity(DiscountRuleRequest r) {
        DiscountRule e = new DiscountRule();
        e.setName(r.name()); e.setScope(r.scope()); e.setShopId(r.shopId());
        e.setType(r.type()); e.setValue(r.value()); e.setMaxDiscountAmount(r.maxDiscountAmount());
        e.setMinOrderAmount(r.minOrderAmount()); e.setMinPages(r.minPages());
        if (r.startsAt() != null) e.setStartsAt(r.startsAt());
        e.setEndsAt(r.endsAt()); e.setUsageLimitTotal(r.usageLimitTotal());
        e.setUsageLimitPerUser(r.usageLimitPerUser());
        if (r.active() != null) e.setActive(r.active());
        return e;
    }

    static DiscountRuleResponse toDto(DiscountRule e) {
        return new DiscountRuleResponse(e.getId(), e.getName(), e.getScope(), e.getShopId(),
                e.getType(), e.getValue(), e.getMaxDiscountAmount(), e.getMinOrderAmount(),
                e.getMinPages(), e.getStartsAt(), e.getEndsAt(), e.getUsageLimitTotal(),
                e.getUsageLimitPerUser(), e.getTimesUsed(), e.isActive(), e.getCreatedAt(), e.getUpdatedAt());
    }

    static CouponResponse toCouponDto(Coupon c) {
        return new CouponResponse(c.getId(), c.getDiscountRuleId(), c.getCode(), c.getValidFrom(), c.getValidTo(), c.getCreatedAt());
    }
}
