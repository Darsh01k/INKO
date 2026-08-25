package com.inko.orders.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "order_number", nullable = false, unique = true, length = 30)
    private String orderNumber;
    @Column(name = "customer_id", nullable = false)
    private UUID customerId;
    @Column(name = "shop_id", nullable = false)
    private UUID shopId;
    @Column(nullable = false, length = 25)
    private String status = OrderStatus.CREATED.name();
    @Column(name = "total_pages", nullable = false)
    private int totalPages;
    @Column(nullable = false)
    private int copies = 1;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;
    @Column(name = "discount_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;
    @Column(name = "tax_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;
    @Column(name = "final_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal finalAmount = BigDecimal.ZERO;
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "pricing_snapshot", nullable = false, columnDefinition = "jsonb")
    private String pricingSnapshot = "{}";
    @Column(name = "coupon_id")
    private UUID couponId;
    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;
    @Column(name = "cancelled_at")
    private Instant cancelledAt;
    @Version
    private long version;
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    public UUID getId() { return id; }
    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String v) { this.orderNumber = v; }
    public UUID getCustomerId() { return customerId; }
    public void setCustomerId(UUID v) { this.customerId = v; }
    public UUID getShopId() { return shopId; }
    public void setShopId(UUID v) { this.shopId = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }
    public OrderStatus statusEnum() { return OrderStatus.valueOf(status); }
    public int getTotalPages() { return totalPages; }
    public void setTotalPages(int v) { this.totalPages = v; }
    public int getCopies() { return copies; }
    public void setCopies(int v) { this.copies = v; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal v) { this.subtotal = v; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal v) { this.discountAmount = v; }
    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal v) { this.taxAmount = v; }
    public BigDecimal getFinalAmount() { return finalAmount; }
    public void setFinalAmount(BigDecimal v) { this.finalAmount = v; }
    public String getPricingSnapshot() { return pricingSnapshot; }
    public void setPricingSnapshot(String v) { this.pricingSnapshot = v; }
    public UUID getCouponId() { return couponId; }
    public void setCouponId(UUID v) { this.couponId = v; }
    public String getCancellationReason() { return cancellationReason; }
    public void setCancellationReason(String v) { this.cancellationReason = v; }
    public Instant getCancelledAt() { return cancelledAt; }
    public void setCancelledAt(Instant v) { this.cancelledAt = v; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
