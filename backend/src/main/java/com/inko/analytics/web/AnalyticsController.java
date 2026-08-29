package com.inko.analytics.web;

import com.inko.analytics.service.AnalyticsService;
import com.inko.identity.security.AppUserDetailsService.InkoPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService svc;
    private final com.inko.shops.repo.ShopRepository shops;

    public AnalyticsController(AnalyticsService svc, com.inko.shops.repo.ShopRepository shops) { this.svc = svc; this.shops = shops; }

    private void checkShopAccess(InkoPrincipal p, UUID shopId) {
        if (shopId == null) return;
        if (p == null) return;
        boolean isAdmin = p.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        if (isAdmin) return;
        boolean isKeeper = p.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SHOPKEEPER"));
        if (!isKeeper) return;
        if (!shops.existsByOwnerUserIdAndId(p.userId(), shopId)) throw new com.inko.common.error.ApiException(com.inko.common.error.ErrorCode.FORBIDDEN, "You do not manage this shop");
    }

    @GetMapping("/overview")
    public Map<String,Object> overview(@AuthenticationPrincipal InkoPrincipal p, @RequestParam(required = false) UUID shopId) {
        if (shopId == null && p != null && p.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SHOPKEEPER")) && p.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"))) {
            throw new com.inko.common.error.ApiException(com.inko.common.error.ErrorCode.FORBIDDEN, "Shopkeeper must specify own shopId");
        }
        checkShopAccess(p, shopId); return svc.overview(shopId);
    }

    @GetMapping("/revenue")
    public Map<String,Object> revenue(@AuthenticationPrincipal InkoPrincipal p, @RequestParam(required = false) UUID shopId) {
        checkShopAccess(p, shopId);
        if (shopId != null) {
            return Map.of("byShop", Map.of(shopId.toString(),
                    svc.dailySeries(30, shopId).stream()
                        .map(m -> m.get("revenue"))
                        .reduce(java.math.BigDecimal.ZERO, (a, b) -> a.add((java.math.BigDecimal) b), java.math.BigDecimal::add)));
        }
        if (p != null && p.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SHOPKEEPER"))) throw new com.inko.common.error.ApiException(com.inko.common.error.ErrorCode.FORBIDDEN, "Platform revenue requires admin");
        return svc.revenueByShop();
    }

    @GetMapping("/mix")
    public List<Map<String,Object>> mix(@AuthenticationPrincipal InkoPrincipal p) {
        if (p != null && p.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SHOPKEEPER"))) throw new com.inko.common.error.ApiException(com.inko.common.error.ErrorCode.FORBIDDEN, "Mix requires admin");
        return svc.colorMix();
    }

    @GetMapping("/series")
    public List<Map<String,Object>> series(@AuthenticationPrincipal InkoPrincipal p, @RequestParam(defaultValue = "7") int days,
                                           @RequestParam(required = false) UUID shopId) {
        checkShopAccess(p, shopId);
        return svc.dailySeries(days, shopId);
    }
}
