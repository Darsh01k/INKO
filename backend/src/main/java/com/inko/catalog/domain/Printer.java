package com.inko.catalog.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "printers")
public class Printer {

    public enum PrinterStatus { ONLINE, PRINTING, IDLE, OFFLINE, ERROR, MAINTENANCE }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "shop_id", nullable = false)
    private UUID shopId;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 120)
    private String model;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private PrinterStatus status = PrinterStatus.OFFLINE;

    @Column(name = "color_capable", nullable = false)
    private boolean colorCapable = false;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "last_heartbeat")
    private Instant lastHeartbeat;

    @Column(name = "maintenance_notes", length = 500)
    private String maintenanceNotes;

    @Column(name = "pages_printed_total", nullable = false)
    private long pagesPrintedTotal = 0;

    @Column(name = "failure_count_30d", nullable = false)
    private int failureCount30d = 0;

    @ElementCollection
    @CollectionTable(name = "printer_paper_sizes", joinColumns = @JoinColumn(name = "printer_id"))
    @Column(name = "paper_size", length = 20)
    private Set<String> paperSizes = new HashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UUID getId() { return id; }
    public UUID getShopId() { return shopId; }
    public void setShopId(UUID v) { this.shopId = v; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public String getModel() { return model; }
    public void setModel(String v) { this.model = v; }
    public PrinterStatus getStatus() { return status; }
    public void setStatus(PrinterStatus v) { this.status = v; }
    public boolean isColorCapable() { return colorCapable; }
    public void setColorCapable(boolean v) { this.colorCapable = v; }
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String v) { this.errorMessage = v; }
    public Instant getLastHeartbeat() { return lastHeartbeat; }
    public void setLastHeartbeat(Instant v) { this.lastHeartbeat = v; }
    public String getMaintenanceNotes() { return maintenanceNotes; }
    public void setMaintenanceNotes(String v) { this.maintenanceNotes = v; }
    public long getPagesPrintedTotal() { return pagesPrintedTotal; }
    public void setPagesPrintedTotal(long v) { this.pagesPrintedTotal = v; }
    public int getFailureCount30d() { return failureCount30d; }
    public void setFailureCount30d(int v) { this.failureCount30d = v; }
    public Set<String> getPaperSizes() { return paperSizes; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
