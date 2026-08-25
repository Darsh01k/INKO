package com.inko.orders.web;

import com.inko.identity.security.AppUserDetailsService.InkoPrincipal;
import com.inko.orders.domain.Order;
import com.inko.orders.domain.OrderStatus;
import com.inko.orders.repo.OrderItemRepository;
import com.inko.orders.service.OrderService;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService svc;
    private final OrderItemRepository items;

    public OrderController(OrderService svc, OrderItemRepository items) { this.svc = svc; this.items = items; }

    public record CreateOrderRequest(@NotNull UUID shopId, @NotEmpty List<Item> items, String couponCode) {
        public record Item(@NotNull UUID documentId, @NotNull String paperSize, @NotNull String colorMode, @NotNull String sidesMode, String orientation, String pageSelection, int copies) {}
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Order create(@AuthenticationPrincipal InkoPrincipal p, @RequestBody CreateOrderRequest req) {
        var specs = req.items().stream().map(i -> new OrderService.ItemSpec(i.documentId(), i.paperSize(), i.colorMode(), i.sidesMode(), i.orientation(), i.pageSelection(), i.copies())).toList();
        return svc.create(p.userId(), req.shopId(), specs, req.couponCode());
    }

    @GetMapping
    public List<Order> myOrders(@AuthenticationPrincipal InkoPrincipal p) { return svc.forCustomer(p.userId()); }

    @GetMapping("/{id}")
    public Object get(@AuthenticationPrincipal InkoPrincipal p, @PathVariable UUID id) {
        Order o = svc.get(id);
        if (!o.getCustomerId().equals(p.userId()) && !hasShopAccess(p, o.getShopId())) throw com.inko.common.error.ApiException.forbidden("Not authorized");
        return java.util.Map.of("order", o, "items", items.findByOrderId(id));
    }

    @PostMapping("/{id}/status")
    public Order transition(@AuthenticationPrincipal InkoPrincipal p, @PathVariable UUID id, @RequestBody java.util.Map<String,String> body) {
        OrderStatus target = OrderStatus.valueOf(body.get("status"));
        return svc.transition(id, target, p.userId());
    }

    @GetMapping("/shop/{shopId}")
    public List<Order> shopOrders(@PathVariable UUID shopId) { return svc.forShop(shopId); }

    private boolean hasShopAccess(InkoPrincipal p, UUID shopId) {
        return p.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN") || a.getAuthority().equals("ROLE_SHOPKEEPER"));
    }
}
