package com.inko.orders.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "order_items")
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "order_id", nullable = false)
    private UUID orderId;
    @Column(name = "document_id", nullable = false)
    private UUID documentId;
    @Column(name = "configuration_id", nullable = false)
    private UUID configurationId;
    @Column(name = "page_count", nullable = false)
    private int pageCount;
    @Column(nullable = false)
    private int copies;
    @Column(name = "item_subtotal", nullable = false, precision = 12, scale = 2)
    private BigDecimal itemSubtotal = BigDecimal.ZERO;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
    public UUID getId() { return id; }
    public UUID getOrderId() { return orderId; }
    public void setOrderId(UUID v) { this.orderId = v; }
    public UUID getDocumentId() { return documentId; }
    public void setDocumentId(UUID v) { this.documentId = v; }
    public UUID getConfigurationId() { return configurationId; }
    public void setConfigurationId(UUID v) { this.configurationId = v; }
    public int getPageCount() { return pageCount; }
    public void setPageCount(int v) { this.pageCount = v; }
    public int getCopies() { return copies; }
    public void setCopies(int v) { this.copies = v; }
    public BigDecimal getItemSubtotal() { return itemSubtotal; }
    public void setItemSubtotal(BigDecimal v) { this.itemSubtotal = v; }
}
