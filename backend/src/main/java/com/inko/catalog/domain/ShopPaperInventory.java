package com.inko.catalog.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "shop_paper_inventory")
public class ShopPaperInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "shop_id", nullable = false)
    private UUID shopId;

    @Column(name = "paper_size", nullable = false, length = 20)
    private String paperSize;

    @Column(name = "gsm")
    private Integer gsm;

    @Column(name = "quantity_sheets", nullable = false)
    private int quantitySheets = 0;

    @Column(name = "low_stock_threshold", nullable = false)
    private int lowStockThreshold = 100;

    @Column(name = "is_available", nullable = false)
    private boolean available = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UUID getId() { return id; }
    public UUID getShopId() { return shopId; }
    public void setShopId(UUID v) { this.shopId = v; }
    public String getPaperSize() { return paperSize; }
    public void setPaperSize(String v) { this.paperSize = v; }
    public Integer getGsm() { return gsm; }
    public void setGsm(Integer v) { this.gsm = v; }
    public int getQuantitySheets() { return quantitySheets; }
    public void setQuantitySheets(int v) { this.quantitySheets = Math.max(0, v); }
    public int getLowStockThreshold() { return lowStockThreshold; }
    public void setLowStockThreshold(int v) { this.lowStockThreshold = Math.max(0, v); }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean v) { this.available = v; }
}
