package com.inko.payments.service;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

public interface PaymentProvider {
    String createCheckout(UUID orderId, BigDecimal amount, String method);
    boolean verify(String providerRef, Map<String,String> payload);
    String name();
}
