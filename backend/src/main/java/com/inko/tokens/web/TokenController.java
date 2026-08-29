package com.inko.tokens.web;

import com.inko.identity.repo.UserRepository;
import com.inko.identity.security.AppUserDetailsService.InkoPrincipal;
import com.inko.orders.repo.OrderRepository;
import com.inko.tokens.domain.Token;
import com.inko.tokens.domain.TokenType;
import com.inko.tokens.service.TokenService;
import com.inko.tokens.web.dto.TokenDtos.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class TokenController {

    private final TokenService svc;
    private final com.inko.orders.repo.OrderRepository orders;
    private final UserRepository users;
    private final java.util.concurrent.ConcurrentHashMap<UUID, List<SseEmitter>> emittersByShop = new java.util.concurrent.ConcurrentHashMap<>();
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public TokenController(TokenService svc, OrderRepository orders, UserRepository users) {
        this.svc = svc; this.orders = orders; this.users = users;
    }

    @PostMapping("/tokens")
    @ResponseStatus(HttpStatus.CREATED)
    public TokenResponse create(@AuthenticationPrincipal InkoPrincipal p, @Valid @RequestBody CreateRequest req) {
        TokenType type = req.type() == null ? TokenType.NORMAL : req.type();
        Token t = svc.generate(req.shopId(), req.orderId(), type);
        broadcast(t);
        return toDto(t);
    }

    @PostMapping("/tokens/{id}/transition")
    public TokenResponse transition(@PathVariable UUID id, @Valid @RequestBody TransitionRequest req) {
        Token t = svc.transition(id, req.targetStatus());
        broadcast(t);
        return toDto(t);
    }

    @GetMapping("/shops/{shopId}/queue")
    public List<TokenResponse> queue(@PathVariable UUID shopId) {
        return enriched(svc.queueForShop(shopId));
    }

    @GetMapping("/tokens/{id}")
    public TokenResponse get(@PathVariable UUID id) {
        var t = svc.byOrder(id);
        if (t == null) throw com.inko.common.error.ApiException.notFound("Token not found");
        return enriched(t);
    }

    @GetMapping(value = "/shops/{shopId}/queue/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@PathVariable UUID shopId) {
        SseEmitter em = new SseEmitter(60_000L);
        emittersByShop.computeIfAbsent(shopId, k -> new CopyOnWriteArrayList<>()).add(em);
        emitters.add(em);
        em.onCompletion(() -> { emitters.remove(em); emittersByShop.getOrDefault(shopId, List.of()).remove(em); });
        em.onTimeout(() -> { emitters.remove(em); emittersByShop.getOrDefault(shopId, List.of()).remove(em); });
        try { em.send(SseEmitter.event().name("connected").data("ok")); } catch (IOException ignored) {}
        return em;
    }

    @GetMapping("/tokens/{id}/wait")
    public QueueResponse waitInfo(@PathVariable UUID id, @RequestParam UUID shopId) {
        long ahead = svc.waitingAhead(shopId, id);
        int est = svc.estimatedWaitMinutes(shopId, id);
        var t = svc.byOrder(id);
        if (t == null) t = svc.queueForShop(shopId).stream().filter(x -> x.getId().equals(id)).findFirst().orElseThrow(() -> com.inko.common.error.ApiException.notFound("Token not found"));
        return new QueueResponse(t.getId(), t.getTokenNumber(), t.getType(), t.getStatus(), est, ahead);
    }

    private void broadcast(Token t) {
        var list = emittersByShop.getOrDefault(t.getShopId(), List.of());
        for (SseEmitter em : list) {
            try { em.send(SseEmitter.event().name("token").data(toDto(t))); } catch (IOException e) { emitters.remove(em); list.remove(em); }
        }
    }

    /** LAN address so QR codes can be generated for phones on the same Wi-Fi. */
    @GetMapping("/net/lan-ip")
    public Map<String, String> lanIp() {
        try (DatagramSocket s = new DatagramSocket()) {
            s.connect(InetAddress.getByName("8.8.8.8"), 53);
            return Map.of("ip", s.getLocalAddress().getHostAddress());
        } catch (Exception e) {
            return Map.of("ip", "127.0.0.1");
        }
    }

    static TokenResponse toDto(Token t) {
        return toDto(t, null, null, null);
    }

    static TokenResponse toDto(Token t, String customerName, String orderNumber) {
        return toDto(t, customerName, orderNumber, null);
    }
    static TokenResponse toDto(Token t, String customerName, String orderNumber, Integer totalPages) {
        return new TokenResponse(t.getId(), t.getShopId(), t.getOrderId(), t.getTokenNumber(), t.getTokenDate(), t.getType(), t.getPriority(), t.getStatus(), t.getIssuedAt(), t.getCalledAt(), t.getStartedAt(), t.getCompletedAt(), customerName, orderNumber, totalPages);
    }

    TokenResponse enriched(Token t) {
        if (t.getOrderId() == null) return toDto(t);
        var order = orders.findById(t.getOrderId()).orElse(null);
        if (order == null) return toDto(t);
        var user = users.findById(order.getCustomerId()).orElse(null);
        return toDto(t, user == null ? null : user.getFullName(), order.getOrderNumber(), order.getTotalPages());
    }

    List<TokenResponse> enriched(List<Token> list) {
        var orderIds = list.stream().map(Token::getOrderId).filter(java.util.Objects::nonNull).collect(Collectors.toSet());
        if (orderIds.isEmpty()) return list.stream().map(TokenController::toDto).toList();
        var orderMap = orders.findAllById(orderIds).stream().collect(Collectors.toMap(o -> o.getId(), Function.identity()));
        var userIds = orderMap.values().stream().map(o -> o.getCustomerId()).collect(Collectors.toSet());
        var userMap = users.findAllById(userIds).stream().collect(Collectors.toMap(u -> u.getId(), u -> u.getFullName()));
        return list.stream().map(t -> {
            var o = t.getOrderId() == null ? null : orderMap.get(t.getOrderId());
            if (o == null) return toDto(t);
            return toDto(t, userMap.get(o.getCustomerId()), o.getOrderNumber(), o.getTotalPages());
        }).toList();
    }
}
