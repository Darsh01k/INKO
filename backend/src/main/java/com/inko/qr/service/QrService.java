package com.inko.qr.service;

import com.inko.common.error.ApiException;
import com.inko.qr.domain.QrCode;
import com.inko.qr.domain.QrScanEvent;
import com.inko.qr.repo.QrCodeRepository;
import com.inko.qr.repo.QrScanEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class QrService {

    private final QrCodeRepository codes;
    private final QrScanEventRepository scans;
    private final SecureRandom random = new SecureRandom();

    public QrService(QrCodeRepository codes, QrScanEventRepository scans) { this.codes = codes; this.scans = scans; }

    @Transactional
    public QrCode generate(UUID shopId, UUID generatedBy) {
        codes.findFirstByShopIdAndStatusOrderByCreatedAtDesc(shopId, "ACTIVE").ifPresent(active -> {
            active.setStatus("REPLACED");
            active.setReplacedById(null);
            codes.save(active);
        });
        String code = randomCode();
        QrCode q = new QrCode();
        q.setShopId(shopId);
        q.setCodeValue(code);
        q.setStatus("ACTIVE");
        q.setGeneratedBy(generatedBy);
        q.setActivatedAt(Instant.now());
        QrCode saved = codes.save(q);
        codes.findFirstByShopIdAndStatusOrderByCreatedAtDesc(shopId, "REPLACED").ifPresent(replaced -> {
            replaced.setReplacedById(saved.getId());
            codes.save(replaced);
        });
        return saved;
    }

    @Transactional(readOnly = true)
    public List<QrCode> forShop(UUID shopId) { return codes.findByShopIdOrderByCreatedAtDesc(shopId); }

    @Transactional(readOnly = true)
    public QrCode resolve(String codeValue) {
        QrCode q = codes.findByCodeValue(codeValue).orElseThrow(() -> ApiException.notFound("QR not found"));
        if ("EXPIRED".equals(q.getStatus()) || "INACTIVE".equals(q.getStatus())) throw ApiException.notFound("QR inactive");
        return q;
    }

    @Transactional
    public QrScanEvent logScan(String codeValue, UUID userId, String ip, String ua) {
        QrCode q = resolve(codeValue);
        QrScanEvent e = new QrScanEvent();
        e.setQrId(q.getId());
        e.setUserId(userId);
        e.setIpAddress(ip);
        e.setUserAgent(ua);
        return scans.save(e);
    }

    @Transactional
    public QrCode regenerate(UUID qrId, UUID actorId) {
        QrCode old = codes.findById(qrId).orElseThrow(() -> ApiException.notFound("QR not found"));
        QrCode next = generate(old.getShopId(), actorId);
        old.setStatus("REPLACED");
        old.setReplacedById(next.getId());
        codes.save(old);
        return next;
    }

    private String randomCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) sb.append(chars.charAt(random.nextInt(chars.length())));
        return sb.toString();
    }
}
