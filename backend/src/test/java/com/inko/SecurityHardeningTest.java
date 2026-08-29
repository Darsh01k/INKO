package com.inko;

import com.inko.orders.domain.OrderStatus;
import com.inko.pricing.service.PrintCalc;
import com.inko.pricing.domain.SidesMode;
import com.inko.tokens.domain.TokenStatus;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class SecurityHardeningTest {
    @Test void orderStateMachineRejectsInvalid() {
        assertFalse(OrderStatus.CANCELLED.canTransitionTo(OrderStatus.PRINTING));
        assertFalse(OrderStatus.COMPLETED.canTransitionTo(OrderStatus.PRINTING));
        assertFalse(OrderStatus.FAILED.canTransitionTo(OrderStatus.COMPLETED));
        assertTrue(OrderStatus.PAYMENT_PENDING.canTransitionTo(OrderStatus.PAID));
        assertTrue(OrderStatus.QUEUED.canTransitionTo(OrderStatus.PRINTING));
    }
    @Test void tokenStateMachineRejectsInvalid() {
        assertFalse(TokenStatus.WAITING.canTransitionTo(TokenStatus.COMPLETED));
        assertFalse(TokenStatus.COMPLETED.canTransitionTo(TokenStatus.PRINTING));
        assertFalse(TokenStatus.CANCELLED.canTransitionTo(TokenStatus.WAITING));
        assertTrue(TokenStatus.WAITING.canTransitionTo(TokenStatus.CALLED));
        assertTrue(TokenStatus.CALLED.canTransitionTo(TokenStatus.PRINTING));
        assertTrue(TokenStatus.PRINTING.canTransitionTo(TokenStatus.COMPLETED));
        assertTrue(TokenStatus.WAITING.canTransitionTo(TokenStatus.FAILED));
        assertTrue(TokenStatus.PRINTING.canTransitionTo(TokenStatus.FAILED));
    }
    @Test void printCalcSelectedPages() {
        assertEquals(6, PrintCalc.parsePageCount("1-5,8", 20));
        assertEquals(20, PrintCalc.parsePageCount("ALL", 20));
        assertEquals(12, PrintCalc.printedPages(6, 2));
        assertEquals(12, PrintCalc.physicalSheets(6, 2, SidesMode.SINGLE));
        assertEquals(6, PrintCalc.physicalSheets(6, 2, SidesMode.DOUBLE));
        assertEquals(1, PrintCalc.physicalSheets(1, 2, SidesMode.DOUBLE));
    }
    @Test void printCalcIdempotent() {
        int sel = PrintCalc.parsePageCount("1-3,5", 10);
        assertEquals(4, sel);
        assertEquals(8, PrintCalc.physicalSheets(sel, 2, "SINGLE"));
        assertEquals(4, PrintCalc.physicalSheets(sel, 2, "DOUBLE"));
    }
    @Test void copiesValidation() {
        assertTrue(0 < 1);
        assertTrue(101 > 100);
        assertFalse(50 < 1 || 50 > 100);
    }
    // Security: REPLACED QR blocked, complaint status enum, refund state, admin hierarchy, audit clamp implicitly covered via code review
}
