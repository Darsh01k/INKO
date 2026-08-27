package com.inko.tokens.web.dto;

import com.inko.tokens.domain.TokenStatus;
import com.inko.tokens.domain.TokenType;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class TokenDtos {
    private TokenDtos() {}
    public record CreateRequest(@NotNull UUID shopId, UUID orderId, TokenType type) {}
    public record TransitionRequest(@NotNull TokenStatus targetStatus) {}
    public record TokenResponse(UUID id, UUID shopId, UUID orderId, String tokenNumber, LocalDate tokenDate, TokenType type, int priority, TokenStatus status, Instant issuedAt, Instant calledAt, Instant startedAt, Instant completedAt, String customerName, String orderNumber, Integer totalPages) {}
    public record QueueResponse(UUID id, String tokenNumber, TokenType type, TokenStatus status, int estimatedWaitMinutes, long waitingAhead) {}
}
