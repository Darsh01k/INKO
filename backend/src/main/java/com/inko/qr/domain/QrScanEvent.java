package com.inko.qr.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "qr_scan_events")
public class QrScanEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "qr_id", nullable = false)
    private UUID qrId;
    @Column(name = "user_id")
    private UUID userId;
    @Column(name = "ip_address", length = 45)
    private String ipAddress;
    @Column(name = "user_agent", length = 300)
    private String userAgent;
    @Column(name = "scanned_at", nullable = false)
    private Instant scannedAt = Instant.now();
    public UUID getId() { return id; }
    public UUID getQrId() { return qrId; }
    public void setQrId(UUID v) { this.qrId = v; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID v) { this.userId = v; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String v) { this.ipAddress = v; }
    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String v) { this.userAgent = v; }
    public Instant getScannedAt() { return scannedAt; }
}
