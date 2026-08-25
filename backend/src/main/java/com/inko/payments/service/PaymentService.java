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
    public Payment initiate(UUID orderId, String method, String idempotencyKey) {
        if (idempotencyKey != null) {
            var existing = payments.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) return existing.get();
        }
        Order o = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Order not found"));
        if (payments.findByOrderId(orderId).isPresent()) throw new ApiException(com.inko.common.error.ErrorCode.CONFLICT, "Payment already exists for order");
        // Drive the order into PAYMENT_PENDING legally (CREATED -> CONFIGURED -> PAYMENT_PENDING)
        if (o.statusEnum() == OrderStatus.CREATED) { o = orderService.transition(orderId, OrderStatus.CONFIGURED, null); }
        if (o.statusEnum() == OrderStatus.CONFIGURED) { o = orderService.transition(orderId, OrderStatus.PAYMENT_PENDING, null); }
        Payment p = new Payment();
        p.setOrderId(orderId); p.setAmount(o.getFinalAmount()); p.setMethod(method == null ? "MOCK_UPI" : method);
        p.setProvider(provider.name()); p.setIdempotencyKey(idempotencyKey);
        if (!"COD".equals(method)) {
            p.setProviderOrderRef(provider.createCheckout(orderId, o.getFinalAmount(), method));
        } else {
            // COD confirms immediately and issues the queue token via the state machine
            orderService.transition(orderId, OrderStatus.COD_SELECTED, null);
            p.setStatus("PAID"); p.setPaidAt(Instant.now());
        }
        return payments.save(p);
    }

    @Transactional
    public Payment verify(UUID paymentId, Map<String,String> payload) {
        Payment p = payments.findById(paymentId).orElseThrow(() -> ApiException.notFound("Payment not found"));
        boolean ok = provider.verify(p.getProviderOrderRef(), payload);
        if (ok) {
            p.setStatus("PAID"); p.setPaidAt(Instant.now());
            var order = orders.findById(p.getOrderId()).orElse(null);
            if (order != null && !OrderStatus.PAID.name().equals(order.getStatus())) {
                // Legal transition PAYMENT_PENDING -> PAID; also issues the queue token (-> QUEUED)
                orderService.transition(p.getOrderId(), OrderStatus.PAID, order.getCustomerId());
                notifier.create(order.getCustomerId(), "PAYMENT_CONFIRMED", "Payment received",
                        "₹" + p.getAmount() + " confirmed — your queue token has been issued.", "/order/" + order.getId());
            } else if (order != null) {
                order.setStatus(OrderStatus.PAID.name()); orders.save(order);
            }
        } else {
            p.setStatus("FAILED");
        }
        return payments.save(p);
    }

    @Transactional
    public Refund requestRefund(UUID orderId, BigDecimal amount, String reason, UUID requestedBy) {
        Order o = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Order not found"));
        Payment p = payments.findByOrderId(orderId).orElseThrow(() -> ApiException.notFound("Payment not found"));
        if (!"PAID".equals(p.getStatus()) && !"PARTIALLY_REFUNDED".equals(p.getStatus())) throw new ApiException(com.inko.common.error.ErrorCode.VALIDATION_FAILED, "Only paid orders can be refunded");
        BigDecimal max = p.getAmount();
        BigDecimal refundAmt = amount == null ? max : amount;
        if (refundAmt.compareTo(max) > 0) throw new ApiException(com.inko.common.error.ErrorCode.VALIDATION_FAILED, "Refund exceeds paid amount");
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
        r.setDecidedBy(decidedBy);
        if (approve) {
            r.setStatus("COMPLETED");
            var p = payments.findById(r.getPaymentId()).orElse(null);
            if (p != null) {
                List<Refund> all = refunds.findByPaymentId(p.getId());
                BigDecimal total = all.stream().filter(x -> "COMPLETED".equals(x.getStatus())).map(Refund::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add).add(r.getAmount());
                p.setStatus(total.compareTo(p.getAmount()) >= 0 ? "REFUNDED" : "PARTIALLY_REFUNDED");
                payments.save(p);
            }
            var o = orders.findById(r.getOrderId()).orElse(null);
            if (o != null) { o.setStatus(OrderStatus.REFUNDED.name()); orders.save(o); }
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
}
