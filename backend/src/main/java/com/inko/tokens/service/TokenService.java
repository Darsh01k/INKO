package com.inko.tokens.service;

import com.inko.common.error.ApiException;
import com.inko.common.error.ErrorCode;
import com.inko.tokens.domain.*;
import com.inko.tokens.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class TokenService {

    private final TokenRepository tokens;
    private final TokenSequenceRepository sequences;
    private final QueueEntryRepository queue;

    public TokenService(TokenRepository tokens, TokenSequenceRepository sequences, QueueEntryRepository queue) {
        this.tokens = tokens; this.sequences = sequences; this.queue = queue;
    }

    @Transactional
    public Token generate(UUID shopId, UUID orderId, TokenType type) {
        LocalDate today = LocalDate.now();
        TokenSequence seq = sequences.findForUpdate(shopId, today).orElseGet(() -> {
            TokenSequence n = new TokenSequence(shopId, today, 0);
            return sequences.save(n);
        });
        int next = seq.getLastNumber() + 1;
        seq.setLastNumber(next);
        sequences.save(seq);

        String number = String.format("A%03d", next);
        int priority = switch (type) {
            case URGENT -> 10;
            case MANUAL -> 20;
            case LATE -> 200;
            case NORMAL -> 100;
        };

        Token t = new Token();
        t.setShopId(shopId); t.setOrderId(orderId); t.setTokenNumber(number);
        t.setTokenDate(today); t.setType(type); t.setPriority(priority);
        t.setStatus(TokenStatus.GENERATED);
        t = tokens.save(t);

        QueueEntry qe = new QueueEntry();
        qe.setShopId(shopId); qe.setTokenId(t.getId()); qe.setPosition(next); qe.setStatus("WAITING");
        queue.save(qe);

        t.setStatus(TokenStatus.WAITING);
        return tokens.save(t);
    }

    @Transactional
    public Token transition(UUID tokenId, TokenStatus target) {
        Token t = tokens.findById(tokenId).orElseThrow(() -> ApiException.notFound("Token not found"));
        if (!t.getStatus().canTransitionTo(target))
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Invalid transition " + t.getStatus() + " -> " + target);
        t.setStatus(target);
        if (target == TokenStatus.CALLED) t.setCalledAt(Instant.now());
        if (target == TokenStatus.PRINTING) t.setStartedAt(Instant.now());
        if (target == TokenStatus.COMPLETED) t.setCompletedAt(Instant.now());
        queue.findByTokenId(tokenId).ifPresent(qe -> {
            String qs = switch (target) {
                case CALLED -> "CALLED";
                case PRINTING -> "PROCESSING";
                case COMPLETED -> "DONE";
                case CANCELLED, FAILED -> "REMOVED";
                default -> qe.getStatus();
            };
            qe.setStatus(qs);
            queue.save(qe);
        });
        return tokens.save(t);
    }

    @Transactional(readOnly = true)
    public List<Token> queueForShop(UUID shopId) {
        return tokens.findQueue(shopId, LocalDate.now(), List.of(TokenStatus.WAITING, TokenStatus.CALLED, TokenStatus.PRINTING));
    }

    @Transactional(readOnly = true)
    public Token byOrder(UUID orderId) {
        return tokens.findByOrderId(orderId).orElse(null);
    }

    @Transactional(readOnly = true)
    public long waitingAhead(UUID shopId, UUID tokenId) {
        Token me = tokens.findById(tokenId).orElseThrow(() -> ApiException.notFound("Token not found"));
        return tokens.findQueue(shopId, me.getTokenDate(), List.of(TokenStatus.WAITING)).stream()
                .filter(t -> t.getPriority() < me.getPriority() || (t.getPriority() == me.getPriority() && t.getIssuedAt().isBefore(me.getIssuedAt())))
                .count();
    }

    @Transactional(readOnly = true)
    public int estimatedWaitMinutes(UUID shopId, UUID tokenId) {
        long ahead = waitingAhead(shopId, tokenId);
        return (int) (ahead * 4) + 2;
    }
}
