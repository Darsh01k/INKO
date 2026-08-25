package com.inko.tokens.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "tokens", uniqueConstraints = @UniqueConstraint(name = "uq_token_shop_date_number", columnNames = {"shop_id","token_date","token_number"}))
public class Token {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "shop_id", nullable = false)
    private UUID shopId;

    @Column(name = "order_id")
    private UUID orderId;

    @Column(name = "token_number", nullable = false, length = 10)
    private String tokenNumber;

    @Column(name = "token_date", nullable = false)
    private LocalDate tokenDate = LocalDate.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private TokenType type = TokenType.NORMAL;

    @Column(nullable = false)
    private int priority = 100;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private TokenStatus status = TokenStatus.GENERATED;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt = Instant.now();

    @Column(name = "called_at")
    private Instant calledAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UUID getId() { return id; }
    public UUID getShopId() { return shopId; }
    public void setShopId(UUID v) { this.shopId = v; }
    public UUID getOrderId() { return orderId; }
    public void setOrderId(UUID v) { this.orderId = v; }
    public String getTokenNumber() { return tokenNumber; }
    public void setTokenNumber(String v) { this.tokenNumber = v; }
    public LocalDate getTokenDate() { return tokenDate; }
    public void setTokenDate(LocalDate v) { this.tokenDate = v; }
    public TokenType getType() { return type; }
    public void setType(TokenType v) { this.type = v; }
    public int getPriority() { return priority; }
    public void setPriority(int v) { this.priority = v; }
    public TokenStatus getStatus() { return status; }
    public void setStatus(TokenStatus v) { this.status = v; }
    public Instant getIssuedAt() { return issuedAt; }
    public void setIssuedAt(Instant v) { this.issuedAt = v; }
    public Instant getCalledAt() { return calledAt; }
    public void setCalledAt(Instant v) { this.calledAt = v; }
    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant v) { this.startedAt = v; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant v) { this.completedAt = v; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
