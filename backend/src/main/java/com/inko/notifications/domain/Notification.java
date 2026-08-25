package com.inko.notifications.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notifications")
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "recipient_id", nullable = false)
    private UUID recipientId;
    @Column(nullable = false, length = 40)
    private String type;
    @Column(nullable = false, length = 200)
    private String title;
    @Column(length = 1000)
    private String body;
    @Column(name = "link_path", length = 300)
    private String linkPath;
    @Column(name = "is_read", nullable = false)
    private boolean read = false;
    @Column(name = "read_at")
    private Instant readAt;
    @Column(nullable = false, length = 10)
    private String channel = "IN_APP";
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
    public UUID getId() { return id; }
    public UUID getRecipientId() { return recipientId; }
    public void setRecipientId(UUID v) { this.recipientId = v; }
    public String getType() { return type; }
    public void setType(String v) { this.type = v; }
    public String getTitle() { return title; }
    public void setTitle(String v) { this.title = v; }
    public String getBody() { return body; }
    public void setBody(String v) { this.body = v; }
    public String getLinkPath() { return linkPath; }
    public void setLinkPath(String v) { this.linkPath = v; }
    public boolean isRead() { return read; }
    public void setRead(boolean v) { this.read = v; }
    public Instant getReadAt() { return readAt; }
    public void setReadAt(Instant v) { this.readAt = v; }
    public Instant getCreatedAt() { return createdAt; }
}
