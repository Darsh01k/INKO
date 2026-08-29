package com.inko.orders.service;

import com.inko.common.error.ApiException;
import com.inko.common.error.ErrorCode;
import com.inko.documents.repo.DocumentRepository;
import com.inko.notifications.service.NotificationService;
import com.inko.orders.domain.*;
import com.inko.orders.repo.*;
import com.inko.pricing.domain.*;
import com.inko.pricing.service.*;
import com.inko.shops.repo.ShopRepository;
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
    private final ShopRepository shops;
    private final com.inko.pricing.repo.CouponRepository coupons;
    private final com.inko.pricing.repo.CouponRedemptionRepository redemptions;
    private final com.inko.pricing.repo.DiscountRuleRepository discountRules;

    public OrderService(OrderRepository orders, OrderItemRepository items, PrintConfigurationRepository configs, DocumentRepository docs, PricingService pricing, TokenService tokens, NotificationService notifier, ShopRepository shops, com.inko.pricing.repo.CouponRepository coupons, com.inko.pricing.repo.CouponRedemptionRepository redemptions, com.inko.pricing.repo.DiscountRuleRepository discountRules) {
        this.orders = orders; this.items = items; this.configs = configs; this.docs = docs; this.pricing = pricing; this.tokens = tokens; this.notifier = notifier; this.shops = shops; this.coupons = coupons; this.redemptions = redemptions; this.discountRules = discountRules;
    }

    @Transactional
    public Order create(UUID customerId, UUID shopId, List<ItemSpec> specs, String couponCode) {
        if (shopId == null) throw new ApiException(ErrorCode.VALIDATION_FAILED, "shopId is required");
        var shop = shops.findById(shopId).orElseThrow(() -> ApiException.notFound("Shop not found"));
        if (shop.getStatus() != com.inko.shops.domain.ShopStatus.OPEN) throw new ApiException(ErrorCode.VALIDATION_FAILED, "Shop is not open");
        if (specs == null || specs.isEmpty()) throw new ApiException(ErrorCode.VALIDATION_FAILED, "No items");
        int totalPages = 0;
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal discount = BigDecimal.ZERO;
        BigDecimal tax = BigDecimal.ZERO;
        BigDecimal finalAmount = BigDecimal.ZERO;
        String snapshot = "{}";
        BigDecimal lastUnit = BigDecimal.ZERO;
        int lastSheets = 0;
        int lastPrinted = 0;

        for (ItemSpec s : specs) {
            if (s.copies() < 1 || s.copies() > 100) throw new ApiException(ErrorCode.VALIDATION_FAILED, "copies must be 1-100");
            try { PaperSize.valueOf(s.paperSize()); } catch(Exception e){ throw new ApiException(ErrorCode.VALIDATION_FAILED, "Invalid paperSize"); }
            try { ColorMode.valueOf(s.colorMode()); } catch(Exception e){ throw new ApiException(ErrorCode.VALIDATION_FAILED, "Invalid colorMode"); }
            try { SidesMode.valueOf(s.sidesMode()); } catch(Exception e){ throw new ApiException(ErrorCode.VALIDATION_FAILED, "Invalid sidesMode"); }
            var doc = docs.findById(s.documentId()).orElseThrow(() -> ApiException.notFound("Document not found"));
            if (!doc.getCustomerId().equals(customerId)) throw new ApiException(ErrorCode.FORBIDDEN, "Not your document");
            int selPages = PrintCalc.parsePageCount(s.pageSelection(), doc.getPageCount() == null ? 1 : doc.getPageCount());
            if (selPages < 1) throw new ApiException(ErrorCode.VALIDATION_FAILED, "selected pages must be >=1");
            PricingRequest pr = new PricingRequest(shopId, PaperSize.valueOf(s.paperSize()), ColorMode.valueOf(s.colorMode()), SidesMode.valueOf(s.sidesMode()), selPages, s.copies(), false, couponCode, customerId);
            var bd = pricing.quote(pr);
            totalPages += bd.printedPages();
            subtotal = subtotal.add(bd.subtotal());
            discount = discount.add(bd.discountAmount());
            tax = tax.add(bd.taxAmount());
            finalAmount = finalAmount.add(bd.finalAmount());
            lastUnit = bd.unitPricePerPage(); lastSheets = bd.sheets(); lastPrinted = bd.printedPages();
            snapshot = "{\"unit\":" + bd.unitPricePerPage() + ",\"shop\":\"" + shopId + "\",\"sheets\":" + bd.sheets() + ",\"printedPages\":" + bd.printedPages() + ",\"selectedPages\":" + bd.pages() + ",\"copies\":" + bd.copies() + "}";
        }

        Order o = new Order();
        o.setOrderNumber("INKO-" + java.time.Year.now() + "-" + String.format("%06d", (int)(Math.random()*999999)));
        o.setCustomerId(customerId); o.setShopId(shopId);
        o.setStatus(OrderStatus.CREATED.name());
        o.setTotalPages(totalPages); o.setCopies(specs.get(0).copies());
        o.setSubtotal(subtotal); o.setDiscountAmount(discount); o.setTaxAmount(tax); o.setFinalAmount(finalAmount);
        o.setPricingSnapshot(snapshot);
        if (couponCode != null && !couponCode.isBlank()) {
            try {
                var coupon = coupons.findByCodeIgnoreCase(couponCode.trim().toUpperCase()).orElse(null);
                if (coupon != null) o.setCouponId(coupon.getId());
            } catch(Exception ignored) {}
        }
        o = orders.save(o);
        if (couponCode != null && !couponCode.isBlank()) {
            try {
                var coupon = coupons.findByCodeIgnoreCase(couponCode.trim().toUpperCase()).orElse(null);
                if (coupon != null) {
                    var dr = discountRules.findByIdForUpdate(coupon.getDiscountRuleId()).orElse(null);
                    if (dr != null) {
                        if (dr.getUsageLimitTotal() != null && dr.getTimesUsed() >= dr.getUsageLimitTotal()) {
                            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Coupon limit reached");
                        }
                        if (dr.getUsageLimitPerUser() != null) {
                            long perUser = redemptions.countByCouponIdAndUserId(coupon.getId(), customerId);
                            if (perUser >= dr.getUsageLimitPerUser()) throw new ApiException(ErrorCode.VALIDATION_FAILED, "Per-user limit");
                        }
                        var redemption = new com.inko.pricing.domain.CouponRedemption();
                        redemption.setCouponId(coupon.getId());
                        redemption.setUserId(customerId);
                        redemption.setOrderId(o.getId());
                        redemptions.save(redemption);
                        dr.setTimesUsed(dr.getTimesUsed() + 1);
                        discountRules.save(dr);
                    }
                }
            } catch(Exception ignored) {}
        }
        notifier.create(customerId, "ORDER_CREATED", "Order " + o.getOrderNumber() + " placed",
                "We received your print job — complete payment to get your queue token.", "/order/" + o.getId());

        for (ItemSpec s : specs) {
            var doc = docs.findById(s.documentId()).orElseThrow();
            int selPages = PrintCalc.parsePageCount(s.pageSelection(), doc.getPageCount() == null ? 1 : doc.getPageCount());
            PrintConfiguration pc = new PrintConfiguration();
            pc.setColorMode(s.colorMode()); pc.setSidesMode(s.sidesMode()); pc.setPaperSize(s.paperSize());
            pc.setOrientation(s.orientation() == null ? "AUTO" : s.orientation());
            pc.setPageSelection(s.pageSelection() == null ? "ALL" : s.pageSelection());
            pc.setSelectedPageCount(selPages); pc.setCopies(s.copies());
            pc = configs.save(pc);
            PricingRequest pr2 = new PricingRequest(shopId, PaperSize.valueOf(s.paperSize()), ColorMode.valueOf(s.colorMode()), SidesMode.valueOf(s.sidesMode()), selPages, s.copies(), false, couponCode, customerId);
            var bd2 = pricing.quote(pr2);
            OrderItem oi = new OrderItem();
            oi.setOrderId(o.getId()); oi.setDocumentId(s.documentId()); oi.setConfigurationId(pc.getId());
            oi.setPageCount(selPages); oi.setCopies(s.copies()); oi.setItemSubtotal(bd2.finalAmount());
            items.save(oi);
        }
        return o;
    }

    @Transactional
    public Order transition(UUID orderId, OrderStatus target, UUID actorId) {
        Order o = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Order not found"));
        OrderStatus cur = o.statusEnum();
        if (cur == target) return o;
        if (!cur.canTransitionTo(target)) throw new ApiException(ErrorCode.VALIDATION_FAILED, "Invalid order transition " + cur + " -> " + target);
        o.setStatus(target.name());
        if (target == OrderStatus.CANCELLED) { o.setCancelledAt(Instant.now()); o.setCancellationReason("Cancelled"); }
        o = orders.save(o);
        if (target == OrderStatus.PAID || target == OrderStatus.COD_SELECTED) {
            if (tokens.byOrder(o.getId()) != null) return o;
            String payTitle = target == OrderStatus.PAID ? "Payment done" : "COD confirmed";
            String payBody = target == OrderStatus.PAID ? "Payment for " + o.getOrderNumber() + " verified — generating your token" : "Order " + o.getOrderNumber() + " confirmed — pay at shop counter";
            notifier.create(o.getCustomerId(), "PAYMENT_" + target.name(), payTitle, payBody, "/order/" + o.getId());
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
        return PrintCalc.parsePageCount(sel, total);
    }

    public record ItemSpec(UUID documentId, String paperSize, String colorMode, String sidesMode, String orientation, String pageSelection, int copies) {}
}
