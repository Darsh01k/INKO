package com.inko.shops.web;

import com.inko.common.error.ApiException;
import com.inko.common.error.ErrorCode;
import com.inko.identity.security.AppUserDetailsService.InkoPrincipal;
import com.inko.identity.domain.RoleName;
import com.inko.shops.domain.Shop;
import com.inko.shops.domain.ShopStatus;
import com.inko.shops.repo.ShopRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
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

    /** Public: customer shop discovery. Admins also see closed shops for governance. */
    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<ShopSummaryDto> listOpenShops(@AuthenticationPrincipal InkoPrincipal principal) {
        if (principal != null && principal.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"))) {
            return shops.findAll(org.springframework.data.domain.Sort.by("name")).stream()
                    .map(ShopController::toDto)
                    .toList();
        }
        return shops.findByStatusIn(List.of(ShopStatus.OPEN, ShopStatus.BUSY)).stream()
                .map(ShopController::toDto)
                .toList();
    }

    /** Shops owned by the signed-in shopkeeper (any status) — drives keeper consoles. */
    @GetMapping("/mine")
    public List<ShopSummaryDto> myShops(@AuthenticationPrincipal InkoPrincipal principal) {
        requireKeeper(principal);
        return shops.findByOwnerUserIdOrderByNameAsc(principal.userId()).stream()
                .map(ShopController::toDto)
                .toList();
    }

    /**
     * Self-service shop onboarding: a shopkeeper registers their print shop and becomes its
     * owner immediately, so QR generation, queue and pricing work without admin intervention.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ShopSummaryDto create(@AuthenticationPrincipal InkoPrincipal principal,
                                 @RequestBody Map<String, Object> body) {
        requireKeeper(principal);
        Object nameObj = body.get("name");
        String name = nameObj == null ? "" : String.valueOf(nameObj).trim();
        if (name.isEmpty() || name.length() > 150) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED,
                    "Shop name is required (max 150 characters)");
        }
        String city = body.get("city") == null ? null : String.valueOf(body.get("city")).trim();
        if (city != null && city.length() > 80) city = city.substring(0, 80);

        Shop shop = new Shop();
        shop.setName(name);
        shop.setCity(city == null || city.isEmpty() ? null : city);
        shop.setOwnerUserId(principal.userId());
        shop.setStatus(ShopStatus.OPEN);
        Object color = body.get("supportsColor");
        shop.setSupportsColor(color == null || Boolean.parseBoolean(String.valueOf(color)));
        return toDto(shops.save(shop));
    }

    /**
     * Tenant isolation: shopkeepers may only view their own shop; admins and customers may
     * view any (customers need it to pick a print destination). Anonymous visitors (QR entry)
     * may view basic details too — the endpoint is public by design.
     */
    @GetMapping("/{id}")
    public ShopSummaryDto get(@AuthenticationPrincipal InkoPrincipal principal,
                              @PathVariable UUID id) {
        Shop shop = shops.findById(id).orElseThrow(() -> ApiException.notFound("Shop not found"));
        if (principal == null) return toDto(shop);

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

    private static void requireKeeper(InkoPrincipal principal) {
        boolean allowed = principal.getAuthorities().stream().anyMatch(a -> {
            String r = a.getAuthority();
            return r.equals("ROLE_" + RoleName.SHOPKEEPER.name())
                    || r.equals("ROLE_" + RoleName.ADMIN.name())
                    || r.equals("ROLE_" + RoleName.SUPER_ADMIN.name());
        });
        if (!allowed) {
            throw ApiException.forbidden("Only shop owners can manage shops");
        }
    }
}
