package com.inko.common.security;

import com.inko.common.error.ApiException;
import com.inko.common.error.ErrorCode;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class RateLimitService {

    private static class Window {
        final AtomicInteger count = new AtomicInteger(0);
        final AtomicLong start = new AtomicLong(System.currentTimeMillis());
    }

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private static final int MAX_ATTEMPTS = 20;
    private static final long WINDOW_MS = 60_000L;

    public void check(String key) {
        Window w = windows.computeIfAbsent(key, k -> new Window());
        long now = System.currentTimeMillis();
        long elapsed = now - w.start.get();
        if (elapsed > WINDOW_MS) {
            w.start.set(now);
            w.count.set(1);
            return;
        }
        int cur = w.count.incrementAndGet();
        if (cur > MAX_ATTEMPTS) {
            throw new ApiException(ErrorCode.TOO_MANY_REQUESTS, "Too many attempts — please wait a moment before retrying.");
        }
    }

    public void checkIp(String ip, String suffix) {
        if (ip == null) ip = "unknown";
        check(ip + ":" + suffix);
    }
}
