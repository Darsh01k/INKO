package com.inko.documents.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "documents")
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    @Column(name = "storage_key", nullable = false, length = 500)
    private String storageKey;

    @Column(name = "mime_type", length = 120)
    private String mimeType;

    @Column(name = "file_extension", length = 10)
    private String fileExtension;

    @Column(name = "file_size_bytes", nullable = false)
    private long fileSizeBytes;

    @Column(name = "checksum_sha256", length = 64)
    private String checksumSha256;

    @Column(nullable = false, length = 15)
    private String status = "UPLOADED";

    @Column(name = "analysis_status", nullable = false, length = 12)
    private String analysisStatus = "PENDING";

    @Column(name = "page_count")
    private Integer pageCount;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "analysis_summary", columnDefinition = "jsonb")
    private String analysisSummary = "{}";

    @Column(name = "virus_scan_status", nullable = false, length = 15)
    private String virusScanStatus = "SKIPPED";

    @Column(name = "uploaded_at", nullable = false)
    private Instant uploadedAt = Instant.now();

    @Column(name = "analyzed_at")
    private Instant analyzedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public UUID getId() { return id; }
    public UUID getCustomerId() { return customerId; }
    public void setCustomerId(UUID v) { this.customerId = v; }
    public String getOriginalFilename() { return originalFilename; }
    public void setOriginalFilename(String v) { this.originalFilename = v; }
    public String getStorageKey() { return storageKey; }
    public void setStorageKey(String v) { this.storageKey = v; }
    public String getMimeType() { return mimeType; }
    public void setMimeType(String v) { this.mimeType = v; }
    public String getFileExtension() { return fileExtension; }
    public void setFileExtension(String v) { this.fileExtension = v; }
    public long getFileSizeBytes() { return fileSizeBytes; }
    public void setFileSizeBytes(long v) { this.fileSizeBytes = v; }
    public String getChecksumSha256() { return checksumSha256; }
    public void setChecksumSha256(String v) { this.checksumSha256 = v; }
    public String getStatus() { return status; }
    public void setStatus(String v) { this.status = v; }
    public String getAnalysisStatus() { return analysisStatus; }
    public void setAnalysisStatus(String v) { this.analysisStatus = v; }
    public Integer getPageCount() { return pageCount; }
    public void setPageCount(Integer v) { this.pageCount = v; }
    public String getAnalysisSummary() { return analysisSummary; }
    public void setAnalysisSummary(String v) { this.analysisSummary = v; }
    public String getVirusScanStatus() { return virusScanStatus; }
    public Instant getUploadedAt() { return uploadedAt; }
    public Instant getAnalyzedAt() { return analyzedAt; }
    public void setAnalyzedAt(Instant v) { this.analyzedAt = v; }
    public Instant getCreatedAt() { return createdAt; }
}
