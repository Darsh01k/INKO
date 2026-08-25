package com.inko.orders.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "print_configurations")
public class PrintConfiguration {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "color_mode", nullable = false, length = 6)
    private String colorMode;
    @Column(name = "sides_mode", nullable = false, length = 7)
    private String sidesMode;
    @Column(nullable = false, length = 10)
    private String orientation = "AUTO";
    @Column(name = "paper_size", nullable = false, length = 20)
    private String paperSize;
    @Column(name = "paper_type_id")
    private UUID paperTypeId;
    @Column(name = "page_selection", nullable = false, length = 500)
    private String pageSelection = "ALL";
    @Column(name = "selected_page_count", nullable = false)
    private int selectedPageCount;
    @Column(nullable = false)
    private int copies = 1;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
    public UUID getId() { return id; }
    public String getColorMode() { return colorMode; }
    public void setColorMode(String v) { this.colorMode = v; }
    public String getSidesMode() { return sidesMode; }
    public void setSidesMode(String v) { this.sidesMode = v; }
    public String getOrientation() { return orientation; }
    public void setOrientation(String v) { this.orientation = v; }
    public String getPaperSize() { return paperSize; }
    public void setPaperSize(String v) { this.paperSize = v; }
    public UUID getPaperTypeId() { return paperTypeId; }
    public void setPaperTypeId(UUID v) { this.paperTypeId = v; }
    public String getPageSelection() { return pageSelection; }
    public void setPageSelection(String v) { this.pageSelection = v; }
    public int getSelectedPageCount() { return selectedPageCount; }
    public void setSelectedPageCount(int v) { this.selectedPageCount = v; }
    public int getCopies() { return copies; }
    public void setCopies(int v) { this.copies = v; }
}
