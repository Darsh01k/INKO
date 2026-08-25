package com.inko.pricing.repo;

import com.inko.pricing.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PricingRuleRepository extends JpaRepository<PricingRule, UUID> {

    @Query("""
        select r from PricingRule r where r.active = true
          and r.paperSize = :paper and r.colorMode = :color and r.sidesMode = :sides
          and r.effectiveFrom <= :today and (r.effectiveTo is null or r.effectiveTo >= :today)
          and ((r.scope = com.inko.pricing.domain.RuleScope.SHOP and r.shopId = :shopId)
               or (r.scope = com.inko.pricing.domain.RuleScope.PLATFORM and r.shopId is null))
        order by case when r.scope = com.inko.pricing.domain.RuleScope.SHOP then 0 else 1 end
        """)
    List<PricingRule> findEffective(UUID shopId, PaperSize paper, ColorMode color, SidesMode sides, LocalDate today);

    default Optional<PricingRule> findResolved(UUID shopId, PaperSize paper, ColorMode color, SidesMode sides, LocalDate today) {
        List<PricingRule> list = findEffective(shopId, paper, color, sides, today);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    List<PricingRule> findByScopeAndShopId(RuleScope scope, UUID shopId);

    List<PricingRule> findByScope(RuleScope scope);

    boolean existsByScopeAndShopIdAndPaperSizeAndColorModeAndSidesModeAndEffectiveFrom(
            RuleScope scope, UUID shopId, PaperSize paper, ColorMode color, SidesMode sides, LocalDate from);
}
