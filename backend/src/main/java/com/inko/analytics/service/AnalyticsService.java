package com.inko.analytics.service;

import com.inko.identity.domain.UserStatus;
import com.inko.identity.repo.UserRepository;
import com.inko.orders.repo.OrderRepository;
import com.inko.shops.repo.ShopRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AnalyticsService {

    private final OrderRepository orders;
    private final ShopRepository shops;
    private final UserRepository users;

    @PersistenceContext
    private EntityManager em;

    public AnalyticsService(OrderRepository orders, ShopRepository shops, UserRepository users) {
        this.orders = orders; this.shops = shops; this.users = users;
    }

    @Transactional(readOnly = true)
    public Map<String,Object> overview() {
        long totalOrders = orders.count();
        long totalShops = shops.count();
        BigDecimal revenue = orders.findAll().stream().map(o -> o.getFinalAmount() == null ? BigDecimal.ZERO : o.getFinalAmount()).reduce(BigDecimal.ZERO, BigDecimal::add);
        long activeUsers = users.countByStatus(UserStatus.ACTIVE);
        long totalUsers = users.count();

        Object[] today = (Object[]) em.createNativeQuery("""
                SELECT COALESCE(COUNT(*),0), COALESCE(SUM(final_amount),0)
                FROM orders WHERE created_at::date = CURRENT_DATE
                """).getSingleResult();
        Number todayOrders = (Number) today[0];
        Number todayRevenue = (Number) today[1];

        Map<String,Object> out = new LinkedHashMap<>();
        out.put("totalOrders", totalOrders);
        out.put("totalShops", totalShops);
        out.put("totalRevenue", revenue);
        out.put("activeUsers", activeUsers);
        out.put("totalUsers", totalUsers);
        out.put("todayOrders", todayOrders.longValue());
        out.put("todayRevenue", todayRevenue == null ? BigDecimal.ZERO : BigDecimal.valueOf(todayRevenue.doubleValue()));
        return out;
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public Map<String,Object> revenueByShop() {
        var list = orders.findAll().stream().collect(java.util.stream.Collectors.groupingBy(o -> o.getShopId().toString(), java.util.stream.Collectors.reducing(BigDecimal.ZERO, o -> o.getFinalAmount() == null ? BigDecimal.ZERO : o.getFinalAmount(), BigDecimal::add)));
        return Map.of("byShop", list);
    }

    /** Pages printed per color mode (B&W vs COLOR split). */
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<Map<String,Object>> colorMix() {
        List<Object[]> rows = em.createNativeQuery("""
                SELECT pc.color_mode, COALESCE(SUM(oi.page_count * oi.copies), 0) AS pages, COUNT(DISTINCT oi.order_id) AS orders
                FROM order_items oi
                JOIN print_configurations pc ON pc.id = oi.configuration_id
                GROUP BY pc.color_mode ORDER BY pages DESC
                """).getResultList();
        long total = rows.stream().mapToLong(r -> ((Number) r[1]).longValue()).sum();
        List<Map<String,Object>> out = new ArrayList<>();
        for (Object[] r : rows) {
            long pages = ((Number) r[1]).longValue();
            Map<String,Object> m = new LinkedHashMap<>();
            m.put("mode", String.valueOf(r[0]));
            m.put("pages", pages);
            m.put("orders", ((Number) r[2]).longValue());
            m.put("sharePercent", total == 0 ? 0 : Math.round(pages * 1000.0 / total) / 10.0);
            out.add(m);
        }
        return out;
    }

    /** Daily orders + revenue series for the last N days, optionally scoped to a shop. */
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<Map<String,Object>> dailySeries(int days, UUID shopId) {
        int safeDays = Math.max(1, Math.min(days, 90));
        String filter = shopId == null
                ? ""
                : " AND shop_id = '" + shopId.toString().replace("'", "") + "'";
        List<Object[]> rows = em.createNativeQuery("""
                SELECT created_at::date AS day, COUNT(*) AS orders, COALESCE(SUM(final_amount), 0) AS revenue
                FROM orders
                WHERE created_at >= CURRENT_DATE - INTERVAL '%d days'%s
                GROUP BY day ORDER BY day
                """.formatted(safeDays, filter)).getResultList();
        List<Map<String,Object>> out = new ArrayList<>();
        for (Object[] r : rows) {
            Map<String,Object> m = new LinkedHashMap<>();
            m.put("date", String.valueOf(r[0]));
            m.put("orders", ((Number) r[1]).longValue());
            m.put("revenue", BigDecimal.valueOf(((Number) r[2]).doubleValue()));
            out.add(m);
        }
        return out;
    }
}
