package com.inko.payments.service;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Service
public class MockPaymentProvider implements PaymentProvider {

    @Override
    public String createCheckout(UUID orderId, BigDecimal amount, String method) {
        return "MOCK-" + orderId.toString().substring(0,8) + "-" + System.currentTimeMillis();
    }

    @Override
    public boolean verify(String providerRef, Map<String,String> payload) {
        if (payload != null && "fail".equals(payload.get("mock_result"))) return false;
        return providerRef != null && providerRef.startsWith("MOCK-");
    }

    @Override
    public String name() { return "MOCK"; }
}
