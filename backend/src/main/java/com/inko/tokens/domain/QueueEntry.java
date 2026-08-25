package com.inko.tokens.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "queue_entries", uniqueConstraints = @UniqueConstraint(columnNames = "token_id"))
public class QueueEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "shop_id", nullable = false)
    private UUID shopId;

    @Column(name = "token_id", nullable = false, unique = true)
    private UUID tokenId;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false, length = 12)
    private String status = "WAITING";

    @Column(name = "queued_at", nullable = false)
    private Instant queuedAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public UUID getId() { return id; }
    public UUID getShopId() { return shopId; }
    public void setShopId(UUID v) { this.shopId = v; }
    public UUID getTokenId() { return tokenId; }
    public void setTokenId(UUID v) { this.tokenId = v; }
    public int getPosition() { return position; }
    public void setPosition(int v) { this.position = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }
    public Instant getQueuedAt() { return queuedAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
