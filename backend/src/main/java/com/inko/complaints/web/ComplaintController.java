package com.inko.complaints.web;

import com.inko.complaints.domain.Complaint;
import com.inko.complaints.repo.ComplaintRepository;
import com.inko.common.error.ApiException;
import com.inko.identity.security.AppUserDetailsService.InkoPrincipal;
import com.inko.notifications.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    private final ComplaintRepository repo;
    private final NotificationService notifier;
    private final com.inko.common.security.RateLimitService rateLimit;

    public ComplaintController(ComplaintRepository repo, NotificationService notifier, com.inko.common.security.RateLimitService rateLimit) {
        this.repo = repo;
        this.notifier = notifier;
        this.rateLimit = rateLimit;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Complaint create(@AuthenticationPrincipal InkoPrincipal p, @RequestBody Map<String,String> body, jakarta.servlet.http.HttpServletRequest req) {
        rateLimit.checkIp(req.getRemoteAddr(), "complaint");
        Complaint c = new Complaint();
        c.setComplaintNumber("CMP-" + System.currentTimeMillis());
        c.setCustomerId(p.userId());
        if (body.get("orderId") != null) c.setOrderId(UUID.fromString(body.get("orderId")));
        if (body.get("shopId") != null) c.setShopId(UUID.fromString(body.get("shopId")));
        c.setCategory(body.getOrDefault("category","OTHER"));
        c.setDescription(body.getOrDefault("description",""));
        return repo.save(c);
    }

    @GetMapping
    public List<Complaint> my(@AuthenticationPrincipal InkoPrincipal p) {
        boolean isAdmin = p.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        if (isAdmin) return repo.findAll();
        return repo.findByCustomerIdOrderByCreatedAtDesc(p.userId());
    }

    @GetMapping("/{id}")
    public Complaint get(@AuthenticationPrincipal InkoPrincipal p, @PathVariable UUID id) {
        Complaint c = repo.findById(id).orElseThrow(() -> com.inko.common.error.ApiException.notFound("Complaint not found"));
        boolean isAdmin = p.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        if (!isAdmin && !c.getCustomerId().equals(p.userId())) throw ApiException.forbidden("Not your complaint");
        return c;
    }

    @PatchMapping("/{id}")
    public Complaint patch(@AuthenticationPrincipal InkoPrincipal p, @PathVariable UUID id, @RequestBody Map<String,String> body) {
        boolean isAdmin = p.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        if (!isAdmin) {
            throw ApiException.forbidden("Only platform admins can update complaints");
        }
        Complaint c = repo.findById(id).orElseThrow(() -> ApiException.notFound("Complaint not found"));
        if (body.containsKey("status")) {
            String ns = body.get("status");
            java.util.Set<String> valid = java.util.Set.of("OPEN","ASSIGNED","INVESTIGATING","RESOLVED","REJECTED","ESCALATED");
            if (!valid.contains(ns)) throw new ApiException(com.inko.common.error.ErrorCode.VALIDATION_FAILED, "Invalid complaint status");
            c.setStatus(ns);
        }
        if (body.containsKey("resolution")) c.setResolution(body.get("resolution"));
        if (body.containsKey("assignedTo")) c.setAssignedTo(UUID.fromString(body.get("assignedTo")));
        Complaint saved = repo.save(c);
        String status = saved.getStatus() == null ? "" : saved.getStatus();
        if (!status.isBlank()) {
            notifier.create(saved.getCustomerId(), "COMPLAINT_" + status,
                    "Complaint " + saved.getComplaintNumber() + " — " + status.toLowerCase(),
                    body.getOrDefault("resolution", "Your complaint status was updated to " + status + "."),
                    "/history");
        }
        return saved;
    }
}
