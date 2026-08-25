package com.inko.shops.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Minimal mapping of the shops tenant table (full management UI arrives in the shop-management phase).
 */
@Entity
@Table(name = "shops")
public class Shop {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "owner_user_id")
    private UUID ownerUserId;

    @Column(length = 80)
    private String city;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ShopStatus status = ShopStatus.CLOSED;

    @Column(name = "supports_color", nullable = false)
    private boolean supportsColor = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public UUID getOwnerUserId() {
        return ownerUserId;
    }

    public void setOwnerUserId(UUID ownerUserId) {
        this.ownerUserId = ownerUserId;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public ShopStatus getStatus() {
        return status;
    }

    public void setStatus(ShopStatus status) {
        this.status = status;
    }

    public boolean isSupportsColor() {
        return supportsColor;
    }

    public void setSupportsColor(boolean supportsColor) {
        this.supportsColor = supportsColor;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
