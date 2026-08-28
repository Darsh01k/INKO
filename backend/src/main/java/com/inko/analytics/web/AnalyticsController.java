package com.inko.analytics.web;

import com.inko.analytics.service.AnalyticsService;
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

    public AnalyticsController(AnalyticsService svc) { this.svc = svc; }

    @GetMapping("/overview")
    public Map<String,Object> overview(@RequestParam(required = false) UUID shopId) { return svc.overview(shopId); }

    @GetMapping("/revenue")
    public Map<String,Object> revenue(@RequestParam(required = false) UUID shopId) {
        if (shopId != null) {
            return Map.of("byShop", Map.of(shopId.toString(),
                    svc.dailySeries(30, shopId).stream()
                        .map(m -> m.get("revenue"))
                        .reduce(java.math.BigDecimal.ZERO, (a, b) -> a.add((java.math.BigDecimal) b), java.math.BigDecimal::add)));
        }
        return svc.revenueByShop();
    }

    @GetMapping("/mix")
    public List<Map<String,Object>> mix() { return svc.colorMix(); }

    @GetMapping("/series")
    public List<Map<String,Object>> series(@RequestParam(defaultValue = "7") int days,
                                           @RequestParam(required = false) UUID shopId) {
        return svc.dailySeries(days, shopId);
    }
}
