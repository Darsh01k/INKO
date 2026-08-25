package com.inko.payments.web;

import com.inko.identity.security.AppUserDetailsService.InkoPrincipal;
import com.inko.payments.domain.Payment;
import com.inko.payments.domain.Refund;
import com.inko.payments.service.PaymentService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class PaymentController {

    private final PaymentService svc;

    public PaymentController(PaymentService svc) { this.svc = svc; }

    @PostMapping("/orders/{orderId}/payment")
    @ResponseStatus(HttpStatus.CREATED)
    public Payment initiate(@PathVariable UUID orderId, @RequestBody Map<String,String> body) {
        return svc.initiate(orderId, body.get("method"), body.get("idempotencyKey"));
    }

    @PostMapping("/payments/{id}/verify")
    public Payment verify(@PathVariable UUID id, @RequestBody(required = false) Map<String,String> payload) {
        return svc.verify(id, payload == null ? Map.of() : payload);
    }

    @GetMapping("/orders/{orderId}/payment")
    public Payment byOrder(@PathVariable UUID orderId) {
        var p = svc.byOrder(orderId);
        if (p == null) throw com.inko.common.error.ApiException.notFound("Payment not found");
        return p;
    }

    @PostMapping("/orders/{orderId}/refund")
    @ResponseStatus(HttpStatus.CREATED)
    public Refund refund(@AuthenticationPrincipal InkoPrincipal p, @PathVariable UUID orderId, @RequestBody Map<String,String> body) {
        BigDecimal amt = body.get("amount") == null ? null : new BigDecimal(body.get("amount"));
        return svc.requestRefund(orderId, amt, body.get("reason"), p == null ? null : p.userId());
    }

    @PostMapping("/refunds/{id}/decision")
    public Refund decide(@AuthenticationPrincipal InkoPrincipal p, @PathVariable UUID id, @RequestBody Map<String,String> body) {
        boolean approve = "APPROVE".equalsIgnoreCase(body.get("decision")) || "APPROVED".equalsIgnoreCase(body.get("decision"));
        return svc.decideRefund(id, approve, p == null ? null : p.userId());
    }

    @GetMapping("/orders/{orderId}/refunds")
    public List<Refund> refunds(@PathVariable UUID orderId) { return svc.forOrder(orderId); }
}
