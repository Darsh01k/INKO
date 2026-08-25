package com.inko.pricing.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "coupons")
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "discount_rule_id", nullable = false, unique = true)
    private UUID discountRuleId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "discount_rule_id", insertable = false, updatable = false)
    private DiscountRule discountRule;

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Column(name = "valid_from", nullable = false)
    private Instant validFrom = Instant.now();

    @Column(name = "valid_to")
    private Instant validTo;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() { return id; }
    public UUID getDiscountRuleId() { return discountRuleId; }
    public void setDiscountRuleId(UUID v) { this.discountRuleId = v; }
    public DiscountRule getDiscountRule() { return discountRule; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code == null ? null : code.toUpperCase(); }
    public Instant getValidFrom() { return validFrom; }
    public void setValidFrom(Instant v) { this.validFrom = v; }
    public Instant getValidTo() { return validTo; }
    public void setValidTo(Instant v) { this.validTo = v; }
    public Instant getCreatedAt() { return createdAt; }
}
