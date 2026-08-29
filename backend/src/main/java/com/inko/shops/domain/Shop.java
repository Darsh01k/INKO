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

    @Column(name = "address_line1", length = 200)
    private String addressLine1;

    @Column(name = "address_line2", length = 200)
    private String addressLine2;

    @Column(length = 80)
    private String state;

    @Column(length = 12)
    private String pincode;

    @Column(columnDefinition = "NUMERIC(9,6)")
    private Double latitude;

    @Column(columnDefinition = "NUMERIC(9,6)")
    private Double longitude;

    @Column(length = 20)
    private String phone;

    @Column(length = 180)
    private String email;

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

    public UUID getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public UUID getOwnerUserId() { return ownerUserId; }
    public void setOwnerUserId(UUID v) { this.ownerUserId = v; }
    public String getCity() { return city; }
    public void setCity(String v) { this.city = v; }
    public String getAddressLine1() { return addressLine1; }
    public void setAddressLine1(String v) { this.addressLine1 = v; }
    public String getAddressLine2() { return addressLine2; }
    public void setAddressLine2(String v) { this.addressLine2 = v; }
    public String getState() { return state; }
    public void setState(String v) { this.state = v; }
    public String getPincode() { return pincode; }
    public void setPincode(String v) { this.pincode = v; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double v) { this.latitude = v; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double v) { this.longitude = v; }
    public String getPhone() { return phone; }
    public void setPhone(String v) { this.phone = v; }
    public String getEmail() { return email; }
    public void setEmail(String v) { this.email = v; }
    public ShopStatus getStatus() { return status; }
    public void setStatus(ShopStatus v) { this.status = v; }
    public boolean isSupportsColor() { return supportsColor; }
    public void setSupportsColor(boolean v) { this.supportsColor = v; }
    public Instant getCreatedAt() { return createdAt; }
}
