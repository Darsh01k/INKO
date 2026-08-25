package com.inko.tokens.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "token_sequences")
@IdClass(TokenSequenceId.class)
public class TokenSequence {

    @Id
    @Column(name = "shop_id")
    private UUID shopId;

    @Id
    @Column(name = "seq_date")
    private LocalDate seqDate;

    @Column(name = "last_number", nullable = false)
    private int lastNumber = 0;

    public TokenSequence() {}
    public TokenSequence(UUID shopId, LocalDate seqDate, int lastNumber) {
        this.shopId = shopId; this.seqDate = seqDate; this.lastNumber = lastNumber;
    }

    public UUID getShopId() { return shopId; }
    public void setShopId(UUID v) { this.shopId = v; }
    public LocalDate getSeqDate() { return seqDate; }
    public void setSeqDate(LocalDate v) { this.seqDate = v; }
    public int getLastNumber() { return lastNumber; }
    public void setLastNumber(int v) { this.lastNumber = v; }
}
