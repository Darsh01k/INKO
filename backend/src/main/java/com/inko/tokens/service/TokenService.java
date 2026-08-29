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
    private final com.inko.orders.repo.OrderRepository ordersRepo;
    private final com.inko.orders.repo.OrderItemRepository itemRepo;
    private final com.inko.orders.repo.PrintConfigurationRepository configRepo;
    private final com.inko.catalog.repo.ShopPaperInventoryRepository inventoryRepo;
    private final com.inko.shops.repo.ShopRepository shopRepo;
    private final com.inko.notifications.service.NotificationService notifier;

    public TokenService(TokenRepository tokens, TokenSequenceRepository sequences, QueueEntryRepository queue, com.inko.orders.repo.OrderRepository ordersRepo, com.inko.orders.repo.OrderItemRepository itemRepo, com.inko.orders.repo.PrintConfigurationRepository configRepo, com.inko.catalog.repo.ShopPaperInventoryRepository inventoryRepo, com.inko.shops.repo.ShopRepository shopRepo, com.inko.notifications.service.NotificationService notifier) {
        this.tokens = tokens; this.sequences = sequences; this.queue = queue; this.ordersRepo = ordersRepo; this.itemRepo = itemRepo; this.configRepo = configRepo; this.inventoryRepo = inventoryRepo; this.shopRepo = shopRepo; this.notifier = notifier;
    }

    @Transactional
    public Token generate(UUID shopId, UUID orderId, TokenType type) {
        if (orderId != null) {
            var existing = tokens.findByOrderId(orderId);
            if (existing.isPresent()) return existing.get();
        }
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
        boolean wasStarted = t.getStartedAt() != null;
        t.setStatus(target);
        if (target == TokenStatus.CALLED) t.setCalledAt(Instant.now());
        if (target == TokenStatus.PRINTING && !wasStarted) t.setStartedAt(Instant.now());
        if (target == TokenStatus.COMPLETED) t.setCompletedAt(Instant.now());
        queue.findByTokenId(tokenId).ifPresent(qe -> {
            String qs = switch (target) {
                case CALLED -> "CALLED";
                case PRINTING -> "PRINTING";
                case COMPLETED -> "COMPLETED";
                case CANCELLED -> "CANCELLED";
                case FAILED -> "FAILED";
                default -> qe.getStatus();
            };
            qe.setStatus(qs);
            queue.save(qe);
        });
        Token saved = tokens.save(t);
        if (t.getOrderId() != null) {
            ordersRepo.findById(t.getOrderId()).ifPresent(o -> {
                try {
                    String cur = o.getStatus();
                    com.inko.orders.domain.OrderStatus targetOrder = switch (target) {
                        case CALLED -> com.inko.orders.domain.OrderStatus.QUEUED;
                        case PRINTING -> com.inko.orders.domain.OrderStatus.PRINTING;
                        case COMPLETED -> com.inko.orders.domain.OrderStatus.COMPLETED;
                        case CANCELLED -> com.inko.orders.domain.OrderStatus.CANCELLED;
                        case FAILED -> com.inko.orders.domain.OrderStatus.FAILED;
                        default -> null;
                    };
                    if (targetOrder != null) {
                        try {
                            com.inko.orders.domain.OrderStatus curEnum = com.inko.orders.domain.OrderStatus.valueOf(cur);
                            if (curEnum.canTransitionTo(targetOrder) || cur.equals("QUEUED")) {
                                o.setStatus(targetOrder.name());
                                ordersRepo.save(o);
                            } else if (target == TokenStatus.PRINTING && cur.equals("QUEUED")) {
                                o.setStatus(com.inko.orders.domain.OrderStatus.PRINTING.name());
                                ordersRepo.save(o);
                            } else if (target == TokenStatus.COMPLETED) {
                                o.setStatus(com.inko.orders.domain.OrderStatus.COMPLETED.name());
                                ordersRepo.save(o);
                            }
                        } catch (Exception ex) {
                            if (target == TokenStatus.COMPLETED) { o.setStatus(com.inko.orders.domain.OrderStatus.COMPLETED.name()); ordersRepo.save(o); }
                            if (target == TokenStatus.PRINTING && cur.equals("QUEUED")) { o.setStatus(com.inko.orders.domain.OrderStatus.PRINTING.name()); ordersRepo.save(o); }
                        }
                    }
                } catch (Exception ignored) {}
                if (target == TokenStatus.PRINTING && !wasStarted) {
                    try {
                        int dec = computePhysicalSheetsForOrder(o.getId());
                        if (dec <= 0) dec = Math.max(1, o.getTotalPages());
                        String targetPaper = resolvePaperSizeForOrder(o.getId());
                        var invRows = inventoryRepo.findByShopIdForUpdate(t.getShopId());
                        com.inko.catalog.domain.ShopPaperInventory chosen = null;
                        if (targetPaper != null) {
                            for (var row : invRows) if (row.getPaperSize().equalsIgnoreCase(targetPaper) && row.getQuantitySheets() > 0) { chosen = row; break; }
                        }
                        if (chosen == null) {
                            for (var row : invRows) if (row.getQuantitySheets() > 0) { chosen = row; break; }
                        }
                        if (chosen != null) {
                            int prev = chosen.getQuantitySheets();
                            int next = Math.max(0, prev - dec);
                            chosen.setQuantitySheets(next);
                            inventoryRepo.save(chosen);
                            if (prev > chosen.getLowStockThreshold() && next <= chosen.getLowStockThreshold()) {
                                try {
                                    var shop = shopRepo.findById(t.getShopId()).orElse(null);
                                    var owner = shop != null ? shop.getOwnerUserId() : null;
                                    if (owner != null) {
                                        int waiting = queue.findByShopIdAndStatusOrderByPositionAsc(t.getShopId(), "WAITING").size();
                                        notifier.create(owner, "LOW_STOCK", "Low paper: " + chosen.getPaperSize(), chosen.getPaperSize() + " only " + next + " sheets left — queue has " + waiting + " waiting. Please add papers.", "/shop/shops");
                                    }
                                } catch (Exception ignored2) {}
                            }
                        }
                    } catch (Exception ignored) {}
                }
                try {
                    var userId = o.getCustomerId();
                    String title = switch (target) {
                        case CALLED -> "Your turn — go to counter";
                        case PRINTING -> "Printing started";
                        case COMPLETED -> "Print completed — collect your print";
                        default -> null;
                    };
                    String body = switch (target) {
                        case CALLED -> "Token " + t.getTokenNumber() + " called — please come to the counter";
                        case PRINTING -> "Your print " + t.getTokenNumber() + " is now printing";
                        case COMPLETED -> "Token " + t.getTokenNumber() + " done — collect from shop";
                        default -> null;
                    };
                    if (title != null) {
                        try { notifier.create(userId, "TOKEN_" + target.name(), title, body, "/queue/" + t.getShopId() + "?order=" + t.getOrderId()); } catch (Exception ignored) {}
                    }
                } catch (Exception ignored) {}
            });
        }
        return saved;
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
        Token me = tokens.findById(tokenId).orElse(null);
        if (me == null) return 2;
        List<Token> aheadTokens = tokens.findQueue(shopId, me.getTokenDate(), List.of(TokenStatus.WAITING)).stream()
                .filter(t -> t.getPriority() < me.getPriority() || (t.getPriority() == me.getPriority() && t.getIssuedAt().isBefore(me.getIssuedAt())))
                .toList();
        int pagesAhead = 0;
        for (Token t : aheadTokens) {
            if (t.getOrderId() != null) pagesAhead += ordersRepo.findById(t.getOrderId()).map(o -> o.getTotalPages()).orElse(2);
        }
        int myPages = me.getOrderId() == null ? 2 : ordersRepo.findById(me.getOrderId()).map(o -> o.getTotalPages()).orElse(5);
        double perPageMin = 0.4;
        double basePerJob = 1.0;
        return (int) Math.max(1, Math.round(pagesAhead * perPageMin + aheadTokens.size() * basePerJob + myPages * perPageMin * 0.5));
    }

    private int computePhysicalSheetsForOrder(UUID orderId){
        var items = itemRepo.findByOrderId(orderId);
        if(items.isEmpty()) return 0;
        int sheets=0;
        for(var it: items){
            var cfg = configRepo.findById(it.getConfigurationId()).orElse(null);
            String sides = cfg!=null?cfg.getSidesMode(): "SINGLE";
            sheets += com.inko.pricing.service.PrintCalc.physicalSheets(it.getPageCount(), it.getCopies(), sides);
        }
        return sheets;
    }
    private String resolvePaperSizeForOrder(UUID orderId){
        var items = itemRepo.findByOrderId(orderId);
        if(items.isEmpty()) return null;
        var cfg = configRepo.findById(items.get(0).getConfigurationId()).orElse(null);
        return cfg!=null? cfg.getPaperSize() : null;
    }
}
