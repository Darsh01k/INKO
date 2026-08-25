package com.inko.pricing.repo;

import com.inko.pricing.domain.DiscountRule;
import com.inko.pricing.domain.RuleScope;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface DiscountRuleRepository extends JpaRepository<DiscountRule, UUID> {

    List<DiscountRule> findByScopeAndShopId(RuleScope scope, UUID shopId);

    List<DiscountRule> findByScope(RuleScope scope);

    @Query("""
        select d from DiscountRule d where d.active = true
          and d.startsAt <= :now and (d.endsAt is null or d.endsAt >= :now)
          and ((d.scope = com.inko.pricing.domain.RuleScope.SHOP and d.shopId = :shopId)
               or d.scope = com.inko.pricing.domain.RuleScope.PLATFORM)
        """)
    List<DiscountRule> findActiveForShop(UUID shopId, Instant now);
}
