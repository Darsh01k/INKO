package com.inko.common.error;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record ApiError(
        Instant timestamp,
        int status,
        String code,
        String message,
        Map<String, Object> details,
        String traceId
) {
    public static ApiError of(int status, String code, String message, Map<String, Object> details) {
        return new ApiError(Instant.now(), status, code, message,
                details == null ? Map.of() : details, UUID.randomUUID().toString());
    }
}
