package com.inko.shops.service;

import com.inko.identity.service.AuthService;
import com.inko.shops.repo.ShopRepository;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class PrimaryShopLookup implements AuthService.ShopLookup {

    private final ShopRepository shops;

    public PrimaryShopLookup(ShopRepository shops) {
        this.shops = shops;
    }

    @Override
    public UUID primaryShopIdForKeeper(UUID keeperUserId) {
        return shops.findFirstByOwnerUserIdOrderByNameAsc(keeperUserId)
                .map(s -> s.getId())
                .orElse(null);
    }
}
