package com.inko.audit.service;

import com.inko.audit.domain.AuditLog;
import com.inko.audit.repo.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuditService {

    private final AuditLogRepository repo;

    public AuditService(AuditLogRepository repo) { this.repo = repo; }

    @Transactional
    public void record(UUID actorId, String actorRole, String action, String resourceType, UUID resourceId, String newValueJson) {
        AuditLog log = new AuditLog();
        log.setActorId(actorId);
        log.setActorRole(actorRole);
        log.setAction(action);
        log.setResourceType(resourceType);
        log.setResourceId(resourceId == null ? null : resourceId.toString());
        if (newValueJson != null) log.setNewValue(newValueJson);
        repo.save(log);
    }
}
