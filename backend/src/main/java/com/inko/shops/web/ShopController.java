package com.inko.shops.web;

import com.inko.common.error.ApiException;
import com.inko.identity.security.AppUserDetailsService.InkoPrincipal;
import com.inko.identity.domain.RoleName;
import com.inko.shops.domain.Shop;
import com.inko.shops.domain.ShopStatus;
import com.inko.shops.repo.ShopRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Read-only shop endpoints for discovery + tenant-isolation enforcement groundwork.
 */
@RestController
@RequestMapping("/api/shops")
public class ShopController {

    public record ShopSummaryDto(UUID id, String name, String city, ShopStatus status,
                                 boolean supportsColor) {
    }

    private final ShopRepository shops;

    public ShopController(ShopRepository shops) {
        this.shops = shops;
    }

    /** Public: customer shop discovery (open shops only). */
    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<ShopSummaryDto> listOpenShops() {
        return shops.findByStatusIn(List.of(ShopStatus.OPEN, ShopStatus.BUSY)).stream()
                .map(ShopController::toDto)
                .toList();
    }

    /**
     * Tenant isolation: shopkeepers may only view their own shop; admins and customers may
     * view any (customers need it to pick a print destination).
     */
    @GetMapping("/{id}")
    public ShopSummaryDto get(@AuthenticationPrincipal InkoPrincipal principal,
                              @PathVariable UUID id) {
        Shop shop = shops.findById(id).orElseThrow(() -> ApiException.notFound("Shop not found"));

        boolean isAdmin = principal.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_" + RoleName.ADMIN.name())
                        || a.getAuthority().equals("ROLE_" + RoleName.SUPER_ADMIN.name()));
        boolean isKeeper = principal.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_" + RoleName.SHOPKEEPER.name()));

        if (isKeeper && !isAdmin && !principal.userId().equals(shop.getOwnerUserId())) {
            throw ApiException.forbidden("You do not manage this shop");
        }
        return toDto(shop);
    }

    private static ShopSummaryDto toDto(Shop s) {
        return new ShopSummaryDto(s.getId(), s.getName(), s.getCity(), s.getStatus(),
                s.isSupportsColor());
    }
}
