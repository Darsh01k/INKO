package com.inko.pricing.web;

import com.inko.pricing.domain.PricingRule;
import com.inko.pricing.domain.RuleScope;
import com.inko.pricing.service.PricingAdminService;
import com.inko.pricing.web.dto.PricingDtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/pricing/rules")
public class AdminPricingController {

    private final PricingAdminService service;

    public AdminPricingController(PricingAdminService service) { this.service = service; }

    @GetMapping
    public List<PricingRuleResponse> list(@RequestParam(required = false) RuleScope scope,
                                          @RequestParam(required = false) UUID shopId) {
        return service.list(scope, shopId).stream().map(PricingController::toDto).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PricingRuleResponse create(@Valid @RequestBody PricingRuleRequest req) {
        PricingRule e = new PricingRule();
        e.setScope(req.scope()); e.setShopId(req.shopId()); e.setPaperSize(req.paperSize());
        e.setColorMode(req.colorMode()); e.setSidesMode(req.sidesMode());
        e.setPricePerPage(req.pricePerPage()); e.setSpecialPaperCharge(req.specialPaperCharge());
        e.setMinOrderAmount(req.minOrderAmount()); e.setEffectiveFrom(req.effectiveFrom());
        e.setEffectiveTo(req.effectiveTo()); if (req.active() != null) e.setActive(req.active());
        return PricingController.toDto(service.create(e));
    }

    @PutMapping("/{id}")
    public PricingRuleResponse update(@PathVariable UUID id, @Valid @RequestBody PricingRuleRequest req) {
        PricingRule p = new PricingRule();
        p.setPricePerPage(req.pricePerPage()); p.setSpecialPaperCharge(req.specialPaperCharge());
        p.setMinOrderAmount(req.minOrderAmount()); p.setEffectiveFrom(req.effectiveFrom());
        p.setEffectiveTo(req.effectiveTo()); if (req.active() != null) p.setActive(req.active());
        return PricingController.toDto(service.update(id, p));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }
}
