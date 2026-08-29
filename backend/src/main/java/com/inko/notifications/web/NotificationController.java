package com.inko.notifications.web;

import com.inko.identity.security.AppUserDetailsService.InkoPrincipal;
import com.inko.notifications.domain.Notification;
import com.inko.notifications.repo.NotificationRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository repo;

    public NotificationController(NotificationRepository repo) { this.repo = repo; }

    @GetMapping
    public List<Notification> list(@AuthenticationPrincipal InkoPrincipal p) {
        return repo.findByRecipientIdOrderByCreatedAtDesc(p.userId());
    }

    @GetMapping("/unread-count")
    public Map<String,Long> unread(@AuthenticationPrincipal InkoPrincipal p) {
        return Map.of("count", repo.countByRecipientIdAndReadFalse(p.userId()));
    }

    @PostMapping("/{id}/read")
    public Notification read(@AuthenticationPrincipal InkoPrincipal p, @PathVariable UUID id) {
        Notification n = repo.findById(id).orElseThrow(() -> com.inko.common.error.ApiException.notFound("Notification not found"));
        if (!n.getRecipientId().equals(p.userId())) throw new com.inko.common.error.ApiException(com.inko.common.error.ErrorCode.FORBIDDEN, "Not your notification");
        n.setRead(true); n.setReadAt(Instant.now());
        return repo.save(n);
    }

    @PostMapping("/read-all")
    public void readAll(@AuthenticationPrincipal InkoPrincipal p) {
        repo.findByRecipientIdOrderByCreatedAtDesc(p.userId()).forEach(n -> { n.setRead(true); n.setReadAt(Instant.now()); repo.save(n); });
    }
}
