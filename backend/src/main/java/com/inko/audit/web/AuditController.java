package com.inko.audit.web;

import com.inko.audit.domain.AuditLog;
import com.inko.audit.repo.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/audit")
public class AuditController {

    private final AuditLogRepository repo;

    public AuditController(AuditLogRepository repo) { this.repo = repo; }

    @GetMapping
    public Page<AuditLog> list(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        if (page < 0) throw new com.inko.common.error.ApiException(com.inko.common.error.ErrorCode.VALIDATION_FAILED, "page must be >=0");
        int s = Math.max(1, Math.min(size, 100));
        return repo.findAll(PageRequest.of(page, s, Sort.by(Sort.Direction.DESC, "createdAt")));
    }
}
