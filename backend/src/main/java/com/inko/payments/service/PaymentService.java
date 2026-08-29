package com.inko.payments.service;

import com.inko.audit.service.AuditService;
import com.inko.common.error.ApiException;
import com.inko.notifications.service.NotificationService;
import com.inko.orders.domain.Order;
import com.inko.orders.domain.OrderStatus;
import com.inko.orders.repo.OrderRepository;
import com.inko.orders.service.OrderService;
import com.inko.payments.domain.Payment;
import com.inko.payments.domain.Refund;
import com.inko.payments.repo.PaymentRepository;
import com.inko.payments.repo.RefundRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {

    private final PaymentRepository payments;
    private final RefundRepository refunds;
    private final OrderRepository orders;
    private final OrderService orderService;
    private final PaymentProvider provider;
    private final NotificationService notifier;
    private final AuditService audit;

    public PaymentService(PaymentRepository payments, RefundRepository refunds, OrderRepository orders, OrderService orderService, PaymentProvider provider, NotificationService notifier, AuditService audit) {
        this.payments = payments; this.refunds = refunds; this.orders = orders; this.orderService = orderService; this.provider = provider; this.notifier = notifier; this.audit = audit;
    }

    @Transactional
    public Payment initiate(UUID orderId, String method, String idempotencyKey) { return initiate(null, orderId, method, idempotencyKey); }
    @Transactional
    public Payment initiate(UUID actorId, UUID orderId, String method, String idempotencyKey) {
        if (idempotencyKey != null) {
            var existing = payments.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) return existing.get();
        }
        Order o = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Order not found"));
        if (actorId != null && !o.getCustomerId().equals(actorId)) {
            boolean isAdmin = false;
            try { var ord = orders.findById(orderId).orElse(null); } catch(Exception ignored) {}
            throw new ApiException(com.inko.common.error.ErrorCode.FORBIDDEN, "Not your order");
        }
        var existingPay = payments.findByOrderId(orderId);
        if (existingPay.isPresent()) return existingPay.get();
        if (o.statusEnum() == OrderStatus.CREATED) { o = orderService.transition(orderId, OrderStatus.CONFIGURED, null); }
        if (o.statusEnum() == OrderStatus.CONFIGURED) { o = orderService.transition(orderId, OrderStatus.PAYMENT_PENDING, null); }
        Payment p = new Payment();
        p.setOrderId(orderId); p.setAmount(o.getFinalAmount()); p.setMethod(method == null ? "MOCK_UPI" : method);
        p.setProvider(provider.name()); p.setIdempotencyKey(idempotencyKey);
        if (!"COD".equals(method)) {
            p.setProviderOrderRef(provider.createCheckout(orderId, o.getFinalAmount(), method));
        } else {
            orderService.transition(orderId, OrderStatus.COD_SELECTED, null);
            p.setStatus("PAID"); p.setPaidAt(Instant.now());
        }
        try { return payments.save(p); } catch (org.springframework.dao.DataIntegrityViolationException e) {
            return payments.findByOrderId(orderId).orElseThrow(() -> e);
        }
    }

    @Transactional
    public Payment verify(UUID paymentId, Map<String,String> payload) { return verify(null, paymentId, payload); }
    @Transactional
    public Payment verify(UUID actorId, UUID paymentId, Map<String,String> payload) {
        Payment p = payments.findById(paymentId).orElseThrow(() -> ApiException.notFound("Payment not found"));
        if (actorId != null) assertOrderAccess(actorId, p.getOrderId());
        if ("PAID".equals(p.getStatus())) return p;
        var orderForAmount = orders.findById(p.getOrderId()).orElse(null);
        if (orderForAmount != null && p.getAmount() != null && orderForAmount.getFinalAmount() != null && p.getAmount().compareTo(orderForAmount.getFinalAmount()) != 0) {
            p.setStatus("FAILED");
            payments.save(p);
            throw new ApiException(com.inko.common.error.ErrorCode.VALIDATION_FAILED, "Payment amount mismatch");
        }
        boolean ok = provider.verify(p.getProviderOrderRef(), payload);
        if (ok) {
            p.setStatus("PAID"); p.setPaidAt(Instant.now());
            payments.save(p);
            var order = orders.findById(p.getOrderId()).orElse(null);
            if (order != null) {
                String cur = order.getStatus();
                if (OrderStatus.PAYMENT_PENDING.name().equals(cur) || OrderStatus.CONFIGURED.name().equals(cur) || OrderStatus.CREATED.name().equals(cur)) {
                    try { orderService.transition(p.getOrderId(), OrderStatus.PAID, order.getCustomerId()); } catch(Exception e){ order.setStatus(OrderStatus.PAID.name()); orders.save(order); }
                    notifier.create(order.getCustomerId(), "PAYMENT_CONFIRMED", "Payment received",
                            "₹" + p.getAmount() + " confirmed — your queue token has been issued.", "/order/" + order.getId());
                }
            }
        } else {
            p.setStatus("FAILED");
            var order = orders.findById(p.getOrderId()).orElse(null);
            if (order != null && OrderStatus.PAYMENT_PENDING.name().equals(order.getStatus())) {
                try { order.setStatus(OrderStatus.FAILED.name()); orders.save(order); } catch(Exception ignored){}
            }
        }
        return payments.save(p);
    }

    @Transactional
    public Refund requestRefund(UUID orderId, BigDecimal amount, String reason, UUID requestedBy) {
        Order o = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Order not found"));
        if (requestedBy != null && !o.getCustomerId().equals(requestedBy)) throw new ApiException(com.inko.common.error.ErrorCode.FORBIDDEN, "Not your order");
        Payment p = payments.findByOrderId(orderId).orElseThrow(() -> ApiException.notFound("Payment not found"));
        if (!"PAID".equals(p.getStatus()) && !"PARTIALLY_REFUNDED".equals(p.getStatus())) throw new ApiException(com.inko.common.error.ErrorCode.VALIDATION_FAILED, "Only paid orders can be refunded");
        BigDecimal max = p.getAmount();
        BigDecimal refundAmt = amount == null ? max : amount;
        if (refundAmt.compareTo(BigDecimal.ZERO) <= 0) throw new ApiException(com.inko.common.error.ErrorCode.VALIDATION_FAILED, "Refund must be > 0");
        if (refundAmt.compareTo(max) > 0) throw new ApiException(com.inko.common.error.ErrorCode.VALIDATION_FAILED, "Refund exceeds paid amount");
        BigDecimal already = refunds.findByOrderId(orderId).stream().filter(r -> !"REJECTED".equals(r.getStatus())).map(Refund::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (already.add(refundAmt).compareTo(max.multiply(new BigDecimal("0.90")).add(max.multiply(new BigDecimal("0.10")))) > 0) {
            if (already.add(refundAmt).compareTo(max) > 0) throw new ApiException(com.inko.common.error.ErrorCode.VALIDATION_FAILED, "Total refunds exceed paid amount");
        }
        BigDecimal fee = refundAmt.multiply(new BigDecimal("0.10")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal net = refundAmt.subtract(fee).max(BigDecimal.ZERO);
        Refund r = new Refund();
        r.setPaymentId(p.getId()); r.setOrderId(orderId); r.setAmount(net);
        r.setRefundType(refundAmt.compareTo(max) < 0 ? "PARTIAL" : "FULL");
        r.setReason(reason); r.setRequestedBy(requestedBy);
        r.setCalculatedBreakdown("{\"gross\":" + refundAmt + ",\"fee\":" + fee + ",\"net\":" + net + "}");
        r.setStatus("REQUESTED");
        return refunds.save(r);
    }

    @Transactional
    public Refund decideRefund(UUID refundId, boolean approve, UUID decidedBy) {
        Refund r = refunds.findById(refundId).orElseThrow(() -> ApiException.notFound("Refund not found"));
        if (!"REQUESTED".equals(r.getStatus())) throw new ApiException(com.inko.common.error.ErrorCode.VALIDATION_FAILED, "Refund already decided");
        r.setDecidedBy(decidedBy);
        if (approve) {
            r.setStatus("APPROVED");
            var p = payments.findById(r.getPaymentId()).orElse(null);
            if (p != null) {
                List<Refund> all = refunds.findByPaymentId(p.getId());
                BigDecimal total = all.stream().filter(x -> "APPROVED".equals(x.getStatus()) || "COMPLETED".equals(x.getStatus())).map(Refund::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add).add(BigDecimal.ZERO);
                total = total.add(r.getAmount());
                boolean full = total.compareTo(p.getAmount()) >= 0;
                p.setStatus(full ? "REFUNDED" : "PARTIALLY_REFUNDED");
                payments.save(p);
                r.setStatus(full ? "COMPLETED" : "APPROVED");
            } else {
                r.setStatus("COMPLETED");
            }
            var o = orders.findById(r.getOrderId()).orElse(null);
            if (o != null) {
                boolean full = "COMPLETED".equals(r.getStatus());
                if (full) {
                    try { if (o.statusEnum().canTransitionTo(OrderStatus.REFUNDED)) o.setStatus(OrderStatus.REFUNDED.name()); else if (o.statusEnum().canTransitionTo(OrderStatus.CANCELLED)) o.setStatus(OrderStatus.CANCELLED.name()); else o.setStatus(OrderStatus.REFUNDED.name()); orders.save(o); } catch(Exception e){ o.setStatus(OrderStatus.REFUNDED.name()); orders.save(o); }
                }
            }
        } else {
            r.setStatus("REJECTED");
        }
        audit.record(decidedBy, "ADMIN", approve ? "REFUND_APPROVED" : "REFUND_REJECTED", "REFUND", refundId,
                "{\"status\":\"" + r.getStatus() + "\",\"orderId\":\"" + r.getOrderId() + "\"}");
        var customerOrder = orders.findById(r.getOrderId()).orElse(null);
        if (customerOrder != null) {
            notifier.create(customerOrder.getCustomerId(), "REFUND_" + r.getStatus(),
                    "Refund " + r.getStatus().toLowerCase() + " — ₹" + r.getAmount(),
                    "Your refund request for order " + customerOrder.getOrderNumber() + " was " + r.getStatus().toLowerCase() + ".",
                    "/order/" + customerOrder.getId());
        }
        return refunds.save(r);
    }

    public List<Refund> forOrder(UUID orderId) { return refunds.findByOrderId(orderId); }
    public Payment byOrder(UUID orderId) { return payments.findByOrderId(orderId).orElse(null); }
    public void assertOrderAccess(UUID actorId, UUID orderId) {
        var o = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Order not found"));
        if (o.getCustomerId().equals(actorId)) return;
        throw new ApiException(com.inko.common.error.ErrorCode.FORBIDDEN, "Not your order");
    }
    public void assertOrderAccess(com.inko.identity.security.AppUserDetailsService.InkoPrincipal p, UUID orderId) {
        var o = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Order not found"));
        if (o.getCustomerId().equals(p.userId())) return;
        boolean isShop = p.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SHOPKEEPER") || a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        if (isShop) return;
        throw new ApiException(com.inko.common.error.ErrorCode.FORBIDDEN, "Not authorized");
    }
}
