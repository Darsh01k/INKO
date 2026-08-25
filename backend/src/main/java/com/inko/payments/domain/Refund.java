package com.inko.payments.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refunds")
public class Refund {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "payment_id", nullable = false)
    private UUID paymentId;
    @Column(name = "order_id", nullable = false)
    private UUID orderId;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;
    @Column(name = "refund_type", nullable = false, length = 10)
    private String refundType = "FULL";
    @Column(length = 500)
    private String reason;
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "calculated_breakdown", nullable = false, columnDefinition = "jsonb")
    private String calculatedBreakdown = "{}";
    @Column(nullable = false, length = 12)
    private String status = "REQUESTED";
    @Column(name = "requested_by")
    private UUID requestedBy;
    @Column(name = "decided_by")
    private UUID decidedBy;
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    public UUID getId() { return id; }
    public UUID getPaymentId() { return paymentId; }
    public void setPaymentId(UUID v) { this.paymentId = v; }
    public UUID getOrderId() { return orderId; }
    public void setOrderId(UUID v) { this.orderId = v; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal v) { this.amount = v; }
    public String getRefundType() { return refundType; }
    public void setRefundType(String v) { this.refundType = v; }
    public String getReason() { return reason; }
    public void setReason(String v) { this.reason = v; }
    public String getCalculatedBreakdown() { return calculatedBreakdown; }
    public void setCalculatedBreakdown(String v) { this.calculatedBreakdown = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }
    public UUID getRequestedBy() { return requestedBy; }
    public void setRequestedBy(UUID v) { this.requestedBy = v; }
    public UUID getDecidedBy() { return decidedBy; }
    public void setDecidedBy(UUID v) { this.decidedBy = v; }
}
