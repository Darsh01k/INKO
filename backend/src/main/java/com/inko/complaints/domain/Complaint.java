package com.inko.complaints.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "complaints")
public class Complaint {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "complaint_number", nullable = false, unique = true, length = 30)
    private String complaintNumber;
    @Column(name = "customer_id", nullable = false)
    private UUID customerId;
    @Column(name = "order_id")
    private UUID orderId;
    @Column(name = "shop_id")
    private UUID shopId;
    @Column(nullable = false, length = 30)
    private String category;
    @Column(nullable = false, columnDefinition = "text")
    private String description;
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String attachments = "[]";
    @Column(nullable = false, length = 15)
    private String status = "OPEN";
    @Column(name = "assigned_to")
    private UUID assignedTo;
    @Column(columnDefinition = "text")
    private String resolution;
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "internal_notes", nullable = false, columnDefinition = "jsonb")
    private String internalNotes = "[]";
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    public UUID getId() { return id; }
    public String getComplaintNumber() { return complaintNumber; }
    public void setComplaintNumber(String v) { this.complaintNumber = v; }
    public UUID getCustomerId() { return customerId; }
    public void setCustomerId(UUID v) { this.customerId = v; }
    public UUID getOrderId() { return orderId; }
    public void setOrderId(UUID v) { this.orderId = v; }
    public UUID getShopId() { return shopId; }
    public void setShopId(UUID v) { this.shopId = v; }
    public String getCategory() { return category; }
    public void setCategory(String v) { this.category = v; }
    public String getDescription() { return description; }
    public void setDescription(String v) { this.description = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }
    public UUID getAssignedTo() { return assignedTo; }
    public void setAssignedTo(UUID v) { this.assignedTo = v; }
    public String getResolution() { return resolution; }
    public void setResolution(String v) { this.resolution = v; }
    public Instant getCreatedAt() { return createdAt; }
}
