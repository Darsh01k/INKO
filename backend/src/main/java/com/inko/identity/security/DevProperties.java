package com.inko.identity.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "inko.app")
public record DevProperties(
        boolean devMode,
        boolean seedDevData
) {
}
