package com.inko.pricing.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "pricing_rules",
        uniqueConstraints = @UniqueConstraint(name = "uq_pricing_rule",
                columnNames = {"scope","shop_id","paper_size","color_mode","sides_mode","effective_from"}))
public class PricingRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private RuleScope scope = RuleScope.PLATFORM;

    @Column(name = "shop_id")
    private UUID shopId;

    @Enumerated(EnumType.STRING)
    @Column(name = "paper_size", nullable = false, length = 20)
    private PaperSize paperSize;

    @Enumerated(EnumType.STRING)
    @Column(name = "color_mode", nullable = false, length = 6)
    private ColorMode colorMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "sides_mode", nullable = false, length = 7)
    private SidesMode sidesMode;

    @Column(name = "price_per_page", nullable = false, precision = 8, scale = 4)
    private BigDecimal pricePerPage;

    @Column(name = "special_paper_charge", nullable = false, precision = 8, scale = 4)
    private BigDecimal specialPaperCharge = BigDecimal.ZERO;

    @Column(name = "min_order_amount", precision = 10, scale = 2)
    private BigDecimal minOrderAmount;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom = LocalDate.now();

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UUID getId() { return id; }
    public RuleScope getScope() { return scope; }
    public void setScope(RuleScope scope) { this.scope = scope; }
    public UUID getShopId() { return shopId; }
    public void setShopId(UUID shopId) { this.shopId = shopId; }
    public PaperSize getPaperSize() { return paperSize; }
    public void setPaperSize(PaperSize paperSize) { this.paperSize = paperSize; }
    public ColorMode getColorMode() { return colorMode; }
    public void setColorMode(ColorMode colorMode) { this.colorMode = colorMode; }
    public SidesMode getSidesMode() { return sidesMode; }
    public void setSidesMode(SidesMode sidesMode) { this.sidesMode = sidesMode; }
    public BigDecimal getPricePerPage() { return pricePerPage; }
    public void setPricePerPage(BigDecimal pricePerPage) { this.pricePerPage = pricePerPage; }
    public BigDecimal getSpecialPaperCharge() { return specialPaperCharge; }
    public void setSpecialPaperCharge(BigDecimal v) { this.specialPaperCharge = v == null ? BigDecimal.ZERO : v; }
    public BigDecimal getMinOrderAmount() { return minOrderAmount; }
    public void setMinOrderAmount(BigDecimal v) { this.minOrderAmount = v; }
    public LocalDate getEffectiveFrom() { return effectiveFrom; }
    public void setEffectiveFrom(LocalDate v) { this.effectiveFrom = v; }
    public LocalDate getEffectiveTo() { return effectiveTo; }
    public void setEffectiveTo(LocalDate v) { this.effectiveTo = v; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
