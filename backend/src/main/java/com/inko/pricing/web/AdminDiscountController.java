package com.inko.pricing.web;

import com.inko.pricing.domain.Coupon;
import com.inko.pricing.domain.DiscountRule;
import com.inko.pricing.service.DiscountAdminService;
import com.inko.pricing.web.dto.PricingDtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/discounts")
public class AdminDiscountController {

    private final DiscountAdminService service;

    public AdminDiscountController(DiscountAdminService service) { this.service = service; }

    @GetMapping
    public List<DiscountRuleResponse> list() {
        return service.list(null, null).stream().map(DiscountController::toDto).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DiscountRuleResponse create(@Valid @RequestBody DiscountRuleRequest req) {
        DiscountRule e = new DiscountRule();
        e.setName(req.name()); e.setScope(req.scope()); e.setShopId(req.shopId());
        e.setType(req.type()); e.setValue(req.value()); e.setMaxDiscountAmount(req.maxDiscountAmount());
        e.setMinOrderAmount(req.minOrderAmount()); e.setMinPages(req.minPages());
        if (req.startsAt() != null) e.setStartsAt(req.startsAt());
        e.setEndsAt(req.endsAt()); e.setUsageLimitTotal(req.usageLimitTotal());
        e.setUsageLimitPerUser(req.usageLimitPerUser());
        if (req.active() != null) e.setActive(req.active());
        return DiscountController.toDto(service.create(e));
    }

    @PutMapping("/{id}")
    public DiscountRuleResponse update(@PathVariable UUID id, @Valid @RequestBody DiscountRuleRequest req) {
        DiscountRule p = new DiscountRule();
        p.setName(req.name()); p.setScope(req.scope()); p.setShopId(req.shopId());
        p.setType(req.type()); p.setValue(req.value()); p.setMaxDiscountAmount(req.maxDiscountAmount());
        p.setMinOrderAmount(req.minOrderAmount()); p.setMinPages(req.minPages());
        if (req.startsAt() != null) p.setStartsAt(req.startsAt());
        p.setEndsAt(req.endsAt()); p.setUsageLimitTotal(req.usageLimitTotal());
        p.setUsageLimitPerUser(req.usageLimitPerUser());
        if (req.active() != null) p.setActive(req.active());
        return DiscountController.toDto(service.update(id, p));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }

    @PostMapping("/{id}/coupon")
    @ResponseStatus(HttpStatus.CREATED)
    public CouponResponse coupon(@PathVariable UUID id, @Valid @RequestBody CouponRequest req) {
        return DiscountController.toCouponDto(service.createCoupon(id, req.code()));
    }

    @GetMapping("/coupons")
    public List<CouponResponse> coupons() {
        return service.listCoupons().stream().map(DiscountController::toCouponDto).toList();
    }
}
