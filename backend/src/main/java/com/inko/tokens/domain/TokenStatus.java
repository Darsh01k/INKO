package com.inko.tokens.domain;

import java.util.Set;

public enum TokenStatus {
    GENERATED, WAITING, CALLED, PRINTING, COMPLETED, LATE, CANCELLED, FAILED;

    public boolean canTransitionTo(TokenStatus next) {
        return switch (this) {
            case GENERATED -> Set.of(WAITING, CANCELLED).contains(next);
            case WAITING -> Set.of(CALLED, LATE, CANCELLED, FAILED).contains(next);
            case CALLED -> Set.of(PRINTING, CANCELLED, FAILED).contains(next);
            case PRINTING -> Set.of(COMPLETED, FAILED, CANCELLED).contains(next);
            case LATE -> Set.of(WAITING, CALLED, CANCELLED).contains(next);
            case FAILED -> Set.of(WAITING, CANCELLED).contains(next);
            case COMPLETED, CANCELLED -> false;
        };
    }
}
