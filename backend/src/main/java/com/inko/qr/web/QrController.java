package com.inko.qr.web;

import com.inko.identity.repo.UserRepository;
import com.inko.identity.security.AppUserDetailsService.InkoPrincipal;
import com.inko.common.error.ApiException;
import com.inko.qr.domain.QrCode;
import com.inko.qr.service.QrService;
import com.inko.qr.repo.QrCodeRepository;
import com.inko.qr.repo.QrScanEventRepository;
import com.inko.shops.repo.ShopRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class QrController {

    private final QrService svc;
    private final QrScanEventRepository scans;
    private final QrCodeRepository qrCodes;
    private final UserRepository users;
    private final ShopRepository shops;

    public QrController(QrService svc, QrScanEventRepository scans, QrCodeRepository qrCodes, UserRepository users, ShopRepository shops) {
        this.svc = svc;
        this.scans = scans;
        this.qrCodes = qrCodes;
        this.users = users;
        this.shops = shops;
    }

    @PostMapping("/shops/{shopId}/qr")
    @ResponseStatus(HttpStatus.CREATED)
    public QrCode generate(@AuthenticationPrincipal InkoPrincipal p, @PathVariable UUID shopId) {
        return svc.generate(shopId, p == null ? null : p.userId());
    }

    @GetMapping("/shops/{shopId}/qr")
    public List<QrCode> list(@PathVariable UUID shopId) { return svc.forShop(shopId); }

    @PostMapping("/qr/{id}/regenerate")
    public QrCode regenerate(@AuthenticationPrincipal InkoPrincipal p, @PathVariable UUID id) {
        return svc.regenerate(id, p == null ? null : p.userId());
    }

    @GetMapping("/qr/{code}/resolve")
    public Map<String,Object> resolve(@PathVariable String code) {
        QrCode q = svc.resolve(code);
        return Map.of("shopId", q.getShopId(), "code", q.getCodeValue(), "status", q.getStatus(), "qrId", q.getId());
    }

    @PostMapping("/qr/{code}/scan")
    public Map<String,Object> scan(@PathVariable String code, @AuthenticationPrincipal InkoPrincipal p, HttpServletRequest req) {
        String ip = req.getRemoteAddr();
        String ua = req.getHeader("User-Agent");
        UUID userId = p == null ? null : p.userId();
        svc.logScan(code, userId, ip, ua);
        QrCode q = svc.resolve(code);
        return Map.of("shopId", q.getShopId(), "redirect", "/shops/" + q.getShopId() + "/print");
    }

    @GetMapping("/shops/{shopId}/qr/scans")
    public List<Map<String,Object>> scanEvents(@AuthenticationPrincipal InkoPrincipal p, @PathVariable UUID shopId) {
        boolean admin = p != null && p.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        if (!admin && (p == null || !shops.existsByOwnerUserIdAndId(p.userId(), shopId))) {
            throw ApiException.forbidden("You do not manage this shop");
        }
        var events = scans.findRecentByShop(shopId);
        var qrMap = qrCodes.findAllById(events.stream().map(e -> e.getQrId()).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(q -> q.getId(), q -> q));
        var userIds = events.stream().map(e -> e.getUserId()).filter(java.util.Objects::nonNull).collect(Collectors.toSet());
        var userMap = userIds.isEmpty() ? new HashMap<UUID,String>() :
                users.findAllById(userIds).stream().collect(Collectors.toMap(u -> u.getId(), u -> u.getFullName()));
        List<Map<String,Object>> out = new ArrayList<>();
        for (var e : events) {
            var q = qrMap.get(e.getQrId());
            String who = e.getUserId() == null ? "Guest / anonymous" : userMap.getOrDefault(e.getUserId(), "Unknown user");
            Map<String,Object> row = new HashMap<>();
            row.put("id", e.getId().toString());
            row.put("qrId", e.getQrId().toString());
            row.put("codeValue", q == null ? "" : q.getCodeValue());
            row.put("qrStatus", q == null ? "" : q.getStatus());
            row.put("userName", who);
            row.put("ip", e.getIpAddress() == null ? "" : e.getIpAddress());
            row.put("scannedAt", e.getScannedAt().toString());
            out.add(row);
        }
        return out;
    }

    @GetMapping("/admin/qr")
    public List<QrCode> adminList(@RequestParam(required = false) UUID shopId) {
        if (shopId != null) return svc.forShop(shopId);
        return svc.forShop(shopId);
    }
}
