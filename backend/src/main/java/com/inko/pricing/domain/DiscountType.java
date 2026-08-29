package com.inko.pricing.domain;

import com.fasterxml.jackson.annotation.JsonAlias;

public enum DiscountType {
    @JsonAlias("PERCENT") PERCENTAGE,
    FIXED
}
