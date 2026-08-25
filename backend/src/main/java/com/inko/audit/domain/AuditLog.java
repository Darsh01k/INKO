package com.inko.audit.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_logs")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "actor_id")
    private UUID actorId;
    @Column(name = "actor_role", length = 30)
    private String actorRole;
    @Column(length = 30)
    private String action;
    @Column(name = "resource_type", length = 60)
    private String resourceType;
    @Column(name = "resource_id")
    private String resourceId;
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "old_value", columnDefinition = "jsonb")
    private String oldValue = "{}";
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "new_value", columnDefinition = "jsonb")
    private String newValue = "{}";
    @Column(name = "ip_address", length = 45)
    private String ipAddress;
    @Column(name = "user_agent", length = 300)
    private String userAgent;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
    public Long getId() { return id; }
    public UUID getActorId() { return actorId; }
    public void setActorId(UUID v) { this.actorId = v; }
    public String getActorRole() { return actorRole; }
    public void setActorRole(String v) { this.actorRole = v; }
    public String getAction() { return action; }
    public void setAction(String v) { this.action = v; }
    public String getResourceType() { return resourceType; }
    public void setResourceType(String v) { this.resourceType = v; }
    public String getResourceId() { return resourceId; }
    public void setResourceId(String v) { this.resourceId = v; }
    public String getOldValue() { return oldValue; }
    public void setOldValue(String v) { this.oldValue = v == null ? "{}" : v; }
    public String getNewValue() { return newValue; }
    public void setNewValue(String v) { this.newValue = v == null ? "{}" : v; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String v) { this.ipAddress = v; }
    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String v) { this.userAgent = v; }
    public Instant getCreatedAt() { return createdAt; }
}
