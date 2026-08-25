package com.inko.qr.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "qr_codes")
public class QrCode {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "shop_id", nullable = false)
    private UUID shopId;
    @Column(name = "code_value", nullable = false, unique = true, length = 64)
    private String codeValue;
    @Column(nullable = false, length = 10)
    private String status = "ACTIVE";
    @Column(name = "replaced_by_id")
    private UUID replacedById;
    @Column(name = "generated_by")
    private UUID generatedBy;
    @Column(name = "activated_at")
    private Instant activatedAt = Instant.now();
    @Column(name = "deactivated_at")
    private Instant deactivatedAt;
    @Column(name = "expires_at")
    private Instant expiresAt;
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    public UUID getId() { return id; }
    public UUID getShopId() { return shopId; }
    public void setShopId(UUID v) { this.shopId = v; }
    public String getCodeValue() { return codeValue; }
    public void setCodeValue(String v) { this.codeValue = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }
    public UUID getReplacedById() { return replacedById; }
    public void setReplacedById(UUID v) { this.replacedById = v; }
    public UUID getGeneratedBy() { return generatedBy; }
    public void setGeneratedBy(UUID v) { this.generatedBy = v; }
    public Instant getActivatedAt() { return activatedAt; }
    public void setActivatedAt(Instant v) { this.activatedAt = v; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant v) { this.expiresAt = v; }
    public Instant getCreatedAt() { return createdAt; }
}
