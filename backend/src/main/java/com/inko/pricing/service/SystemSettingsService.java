package com.inko.pricing.service;

import com.inko.pricing.repo.SystemSettingRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class SystemSettingsService {

    private final SystemSettingRepository repo;

    public SystemSettingsService(SystemSettingRepository repo) {
        this.repo = repo;
    }

    public BigDecimal decimal(String key, BigDecimal fallback) {
        return repo.findById(key).map(s -> parseDecimal(s.getValue(), fallback)).orElse(fallback);
    }

    public String string(String key, String fallback) {
        return repo.findById(key).map(s -> parseString(s.getValue(), fallback)).orElse(fallback);
    }

    private BigDecimal parseDecimal(String json, BigDecimal fallback) {
        if (json == null) return fallback;
        String t = json.trim();
        if (t.startsWith("\"") && t.endsWith("\"") && t.length() >= 2) t = t.substring(1, t.length() - 1);
        try { return new BigDecimal(t); } catch (Exception e) { return fallback; }
    }

    private String parseString(String json, String fallback) {
        if (json == null) return fallback;
        String t = json.trim();
        if (t.startsWith("\"") && t.endsWith("\"") && t.length() >= 2) return t.substring(1, t.length() - 1);
        return t;
    }
}
