package com.inko.notifications.service;

import com.inko.notifications.domain.Notification;
import com.inko.notifications.repo.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class NotificationService {

    private final NotificationRepository repo;

    public NotificationService(NotificationRepository repo) { this.repo = repo; }

    /** Fire-and-forget in-app notification. Silently skips null recipients (guests). */
    @Transactional
    public void create(UUID recipientId, String type, String title, String body, String linkPath) {
        if (recipientId == null) return;
        Notification n = new Notification();
        n.setRecipientId(recipientId);
        n.setType(type);
        n.setTitle(title);
        n.setBody(body);
        n.setLinkPath(linkPath);
        repo.save(n);
    }
}
