package com.inko.orders.domain;

import java.util.Set;

public enum OrderStatus {
    CREATED, CONFIGURED, PAYMENT_PENDING, PAID, COD_SELECTED, TOKEN_GENERATED, QUEUED, ACCEPTED, PRINTING, COMPLETED, CANCELLED, FAILED, RETRY_PENDING, CANCELLATION_REQUESTED, REFUND_PENDING, REFUNDED;

    public boolean canTransitionTo(OrderStatus next) {
        return switch (this) {
            case CREATED -> Set.of(CONFIGURED, CANCELLED).contains(next);
            case CONFIGURED -> Set.of(PAYMENT_PENDING, CANCELLED).contains(next);
            case PAYMENT_PENDING -> Set.of(PAID, COD_SELECTED, CANCELLED, FAILED).contains(next);
            case PAID, COD_SELECTED -> Set.of(TOKEN_GENERATED, CANCELLATION_REQUESTED, CANCELLED).contains(next);
            case TOKEN_GENERATED -> Set.of(QUEUED, CANCELLED).contains(next);
            case QUEUED -> Set.of(ACCEPTED, PRINTING, COMPLETED, CANCELLED, CANCELLATION_REQUESTED).contains(next);
            case ACCEPTED -> Set.of(PRINTING, CANCELLED, FAILED).contains(next);
            case PRINTING -> Set.of(COMPLETED, FAILED, CANCELLED).contains(next);
            case FAILED -> Set.of(RETRY_PENDING, CANCELLED).contains(next);
            case RETRY_PENDING -> Set.of(PRINTING, CANCELLED).contains(next);
            case CANCELLATION_REQUESTED -> Set.of(CANCELLED, REFUND_PENDING, QUEUED).contains(next);
            case REFUND_PENDING -> Set.of(REFUNDED, CANCELLED).contains(next);
            case COMPLETED, CANCELLED, REFUNDED -> false;
        };
    }
}
