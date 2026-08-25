package com.inko.documents.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "document_pages", uniqueConstraints = @UniqueConstraint(columnNames = {"document_id","page_number"}))
public class DocumentPage {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "document_id", nullable = false)
    private UUID documentId;
    @Column(name = "page_number", nullable = false)
    private int pageNumber;
    @Column(length = 10)
    private String orientation;
    @Column(name = "width_pt", precision = 8, scale = 2)
    private BigDecimal widthPt;
    @Column(name = "height_pt", precision = 8, scale = 2)
    private BigDecimal heightPt;
    @Column(name = "is_blank", nullable = false)
    private boolean blank = false;
    @Column(name = "blank_confidence", precision = 4, scale = 3)
    private BigDecimal blankConfidence;
    @Column(name = "is_image_heavy", nullable = false)
    private boolean imageHeavy = false;
    public UUID getId() { return id; }
    public UUID getDocumentId() { return documentId; }
    public void setDocumentId(UUID v) { this.documentId = v; }
    public int getPageNumber() { return pageNumber; }
    public void setPageNumber(int v) { this.pageNumber = v; }
    public String getOrientation() { return orientation; }
    public void setOrientation(String v) { this.orientation = v; }
    public boolean isBlank() { return blank; }
    public void setBlank(boolean v) { this.blank = v; }
    public BigDecimal getBlankConfidence() { return blankConfidence; }
    public void setBlankConfidence(BigDecimal v) { this.blankConfidence = v; }
    public boolean isImageHeavy() { return imageHeavy; }
    public void setImageHeavy(boolean v) { this.imageHeavy = v; }
}
