package com.inko.tokens.domain;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

public class TokenSequenceId implements Serializable {
    private UUID shopId;
    private LocalDate seqDate;
    public TokenSequenceId() {}
    public TokenSequenceId(UUID shopId, LocalDate seqDate) { this.shopId = shopId; this.seqDate = seqDate; }
    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof TokenSequenceId that)) return false;
        return Objects.equals(shopId, that.shopId) && Objects.equals(seqDate, that.seqDate);
    }
    @Override public int hashCode() { return Objects.hash(shopId, seqDate); }
}
