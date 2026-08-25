package com.inko.pricing.service;

import com.inko.pricing.domain.ColorMode;
import com.inko.pricing.domain.PaperSize;
import com.inko.pricing.domain.SidesMode;

import java.util.UUID;

public record PricingRequest(
        UUID shopId,
        PaperSize paperSize,
        ColorMode colorMode,
        SidesMode sidesMode,
        int pages,
        int copies,
        boolean specialPaper,
        String couponCode,
        UUID userId
) {}
