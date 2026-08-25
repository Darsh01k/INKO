package com.inko.identity.service;

import com.inko.identity.repo.RefreshTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Revokes sessions in an independent transaction so security reactions
 * (e.g. refresh-token replay) persist even when the caller's transaction rolls back.
 */
@Service
public class TokenRevocationService {

    private final RefreshTokenRepository refreshTokens;

    public TokenRevocationService(RefreshTokenRepository refreshTokens) {
        this.refreshTokens = refreshTokens;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeAllForUser(UUID userId) {
        refreshTokens.revokeAllForUser(userId, Instant.now());
    }
}
