package com.inko.pricing.service;

import com.inko.common.error.ApiException;
import com.inko.common.error.ErrorCode;
import com.inko.pricing.domain.PricingRule;
import com.inko.pricing.domain.RuleScope;
import com.inko.pricing.repo.PricingRuleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class PricingAdminService {

    private final PricingRuleRepository repo;
    private final SystemSettingsService settings;

    public PricingAdminService(PricingRuleRepository repo, SystemSettingsService settings) {
        this.repo = repo;
        this.settings = settings;
    }

    @Transactional(readOnly = true)
    public List<PricingRule> list(RuleScope scope, UUID shopId) {
        if (scope == RuleScope.SHOP && shopId != null) return repo.findByScopeAndShopId(RuleScope.SHOP, shopId);
        if (scope == RuleScope.PLATFORM) return repo.findByScope(RuleScope.PLATFORM);
        return repo.findAll();
    }

    @Transactional
    public PricingRule create(PricingRule rule) {
        validate(rule, null);
        return repo.save(rule);
    }

    @Transactional
    public PricingRule update(UUID id, PricingRule patch) {
        PricingRule existing = repo.findById(id).orElseThrow(() -> ApiException.notFound("Pricing rule not found"));
        existing.setPricePerPage(patch.getPricePerPage());
        existing.setSpecialPaperCharge(patch.getSpecialPaperCharge());
        existing.setMinOrderAmount(patch.getMinOrderAmount());
        existing.setEffectiveFrom(patch.getEffectiveFrom());
        existing.setEffectiveTo(patch.getEffectiveTo());
        existing.setActive(patch.isActive());
        validate(existing, id);
        return repo.save(existing);
    }

    @Transactional
    public void delete(UUID id) {
        if (!repo.existsById(id)) throw ApiException.notFound("Pricing rule not found");
        repo.deleteById(id);
    }

    private void validate(PricingRule r, UUID existingId) {
        if (r.getPricePerPage() == null || r.getPricePerPage().compareTo(BigDecimal.ZERO) < 0)
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "pricePerPage must be >= 0");
        if (r.getSpecialPaperCharge() != null && r.getSpecialPaperCharge().compareTo(BigDecimal.ZERO) < 0)
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "specialPaperCharge must be >= 0");
        if (r.getEffectiveTo() != null && r.getEffectiveFrom() != null && r.getEffectiveTo().isBefore(r.getEffectiveFrom()))
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "effectiveTo must be >= effectiveFrom");
        if (r.getScope() == RuleScope.PLATFORM && r.getShopId() != null)
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "PLATFORM rule must not have shopId");
        if (r.getScope() == RuleScope.SHOP && r.getShopId() == null)
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "SHOP rule must have shopId");
        if (existingId == null && repo.existsByScopeAndShopIdAndPaperSizeAndColorModeAndSidesModeAndEffectiveFrom(
                r.getScope(), r.getShopId(), r.getPaperSize(), r.getColorMode(), r.getSidesMode(), r.getEffectiveFrom())) {
            throw new ApiException(ErrorCode.CONFLICT, "Pricing rule already exists for this combination and date");
        }
        BigDecimal min = settings.decimal("pricing.min_a4_bw_per_page", null);
        BigDecimal max = settings.decimal("pricing.max_a4_bw_per_page", null);
        boolean isA4Bw = r.getPaperSize() != null && r.getPaperSize().name().equals("A4")
                && r.getColorMode() != null && r.getColorMode().name().equals("BW");
        if (isA4Bw) {
            if (min != null && r.getPricePerPage().compareTo(min) < 0)
                throw new ApiException(ErrorCode.PRICE_OUT_OF_BOUNDS, "Price below platform minimum " + min);
            if (max != null && r.getPricePerPage().compareTo(max) > 0)
                throw new ApiException(ErrorCode.PRICE_OUT_OF_BOUNDS, "Price above platform maximum " + max);
        }
    }
}
