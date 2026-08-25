package com.inko.orders.service;

import com.inko.common.error.ApiException;
import com.inko.common.error.ErrorCode;
import com.inko.documents.repo.DocumentRepository;
import com.inko.notifications.service.NotificationService;
import com.inko.orders.domain.*;
import com.inko.orders.repo.*;
import com.inko.pricing.domain.*;
import com.inko.pricing.service.*;
import com.inko.tokens.domain.Token;
import com.inko.tokens.service.TokenService;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class OrderService {

    private final OrderRepository orders;
    private final OrderItemRepository items;
    private final PrintConfigurationRepository configs;
    private final DocumentRepository docs;
    private final PricingService pricing;
    private final TokenService tokens;
    private final NotificationService notifier;

    public OrderService(OrderRepository orders, OrderItemRepository items, PrintConfigurationRepository configs, DocumentRepository docs, PricingService pricing, TokenService tokens, NotificationService notifier) {
        this.orders = orders; this.items = items; this.configs = configs; this.docs = docs; this.pricing = pricing; this.tokens = tokens; this.notifier = notifier;
    }

    @Transactional
    public Order create(UUID customerId, UUID shopId, List<ItemSpec> specs, String couponCode) {
        if (specs == null || specs.isEmpty()) throw new ApiException(ErrorCode.VALIDATION_FAILED, "No items");
        int totalPages = 0;
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal discount = BigDecimal.ZERO;
        BigDecimal tax = BigDecimal.ZERO;
        BigDecimal finalAmount = BigDecimal.ZERO;
        String snapshot = "{}";

        for (ItemSpec s : specs) {
            var doc = docs.findById(s.documentId()).orElseThrow(() -> ApiException.notFound("Document not found"));
            if (!doc.getCustomerId().equals(customerId)) throw new ApiException(ErrorCode.FORBIDDEN, "Not your document");
            int selPages = parsePages(s.pageSelection(), doc.getPageCount() == null ? 1 : doc.getPageCount());
            PricingRequest pr = new PricingRequest(shopId, PaperSize.valueOf(s.paperSize()), ColorMode.valueOf(s.colorMode()), SidesMode.valueOf(s.sidesMode()), selPages, s.copies(), false, couponCode, customerId);
            var bd = pricing.quote(pr);
            totalPages += bd.printedPages();
            subtotal = subtotal.add(bd.subtotal());
            discount = discount.add(bd.discountAmount());
            tax = tax.add(bd.taxAmount());
            finalAmount = finalAmount.add(bd.finalAmount());
            snapshot = "{\"unit\":" + bd.unitPricePerPage() + ",\"shop\":\"" + shopId + "\"}";
        }

        Order o = new Order();
        o.setOrderNumber("INKO-" + java.time.Year.now() + "-" + String.format("%06d", (int)(Math.random()*999999)));
        o.setCustomerId(customerId); o.setShopId(shopId);
        o.setStatus(OrderStatus.CREATED.name());
        o.setTotalPages(totalPages); o.setCopies(specs.get(0).copies());
        o.setSubtotal(subtotal); o.setDiscountAmount(discount); o.setTaxAmount(tax); o.setFinalAmount(finalAmount);
        o.setPricingSnapshot(snapshot);
        o = orders.save(o);
        notifier.create(customerId, "ORDER_CREATED", "Order " + o.getOrderNumber() + " placed",
                "We received your print job — complete payment to get your queue token.", "/order/" + o.getId());

        for (ItemSpec s : specs) {
            var doc = docs.findById(s.documentId()).orElseThrow();
            int selPages = parsePages(s.pageSelection(), doc.getPageCount() == null ? 1 : doc.getPageCount());
            PrintConfiguration pc = new PrintConfiguration();
            pc.setColorMode(s.colorMode()); pc.setSidesMode(s.sidesMode()); pc.setPaperSize(s.paperSize());
            pc.setOrientation(s.orientation() == null ? "AUTO" : s.orientation());
            pc.setPageSelection(s.pageSelection() == null ? "ALL" : s.pageSelection());
            pc.setSelectedPageCount(selPages); pc.setCopies(s.copies());
            pc = configs.save(pc);
            OrderItem oi = new OrderItem();
            oi.setOrderId(o.getId()); oi.setDocumentId(s.documentId()); oi.setConfigurationId(pc.getId());
            oi.setPageCount(selPages); oi.setCopies(s.copies()); oi.setItemSubtotal(finalAmount);
            items.save(oi);
        }
        return o;
    }

    @Transactional
    public Order transition(UUID orderId, OrderStatus target, UUID actorId) {
        Order o = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Order not found"));
        OrderStatus cur = o.statusEnum();
        if (!cur.canTransitionTo(target)) throw new ApiException(ErrorCode.VALIDATION_FAILED, "Invalid order transition " + cur + " -> " + target);
        o.setStatus(target.name());
        if (target == OrderStatus.CANCELLED) { o.setCancelledAt(Instant.now()); o.setCancellationReason("Cancelled"); }
        o = orders.save(o);
        if (target == OrderStatus.PAID || target == OrderStatus.COD_SELECTED) {
            Token token = tokens.generate(o.getShopId(), o.getId(), com.inko.tokens.domain.TokenType.NORMAL);
            o.setStatus(OrderStatus.TOKEN_GENERATED.name());
            orders.save(o);
            o.setStatus(OrderStatus.QUEUED.name());
            notifier.create(o.getCustomerId(), "TOKEN_ISSUED", "Token " + token.getTokenNumber() + " issued",
                    "Your queue token for order " + o.getOrderNumber() + " is ready — track it live.",
                    "/queue/" + o.getShopId() + "?order=" + o.getId());
        }
        return orders.save(o);
    }

    public List<Order> forCustomer(UUID customerId) { return orders.findByCustomerIdOrderByCreatedAtDesc(customerId); }
    public List<Order> forShop(UUID shopId) { return orders.findByShopIdOrderByCreatedAtDesc(shopId); }
    public Order get(UUID id) { return orders.findById(id).orElseThrow(() -> ApiException.notFound("Order not found")); }

    private int parsePages(String sel, int total) {
        if (sel == null || sel.equalsIgnoreCase("ALL") || sel.isBlank()) return total;
        int count = 0;
        for (String part : sel.split(",")) {
            part = part.trim();
            if (part.contains("-")) {
                String[] b = part.split("-");
                count += Integer.parseInt(b[1].trim()) - Integer.parseInt(b[0].trim()) + 1;
            } else count += 1;
        }
        return Math.min(count, total);
    }

    public record ItemSpec(UUID documentId, String paperSize, String colorMode, String sidesMode, String orientation, String pageSelection, int copies) {}
}
