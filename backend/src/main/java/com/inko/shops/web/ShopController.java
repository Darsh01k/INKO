package com.inko.shops.web;

import com.inko.common.error.ApiException;
import com.inko.common.error.ErrorCode;
import com.inko.identity.security.AppUserDetailsService.InkoPrincipal;
import com.inko.identity.domain.RoleName;
import com.inko.shops.domain.Shop;
import com.inko.shops.domain.ShopStatus;
import com.inko.shops.repo.ShopRepository;
import com.inko.identity.repo.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.RequestMethod;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/shops")
public class ShopController {

    public record ShopSummaryDto(UUID id, String name, String city, ShopStatus status,
                                 boolean supportsColor, String addressLine1, String addressLine2,
                                 String state, String pincode, Double latitude, Double longitude, String phone, String email) {}

    private final ShopRepository shops;
    private final UserRepository users;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public ShopController(ShopRepository shops, UserRepository users) {
        this.shops = shops;
        this.users = users;
    }

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

    @GetMapping("/mine")
    public List<ShopSummaryDto> myShops(@AuthenticationPrincipal InkoPrincipal principal) {
        requireKeeper(principal);
        return shops.findByOwnerUserIdOrderByNameAsc(principal.userId()).stream()
                .map(ShopController::toDto)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ShopSummaryDto create(@AuthenticationPrincipal InkoPrincipal principal,
                                 @RequestBody Map<String, Object> body) {
        requireKeeper(principal);
        String name = str(body.get("name"));
        if (name.isEmpty() || name.length() > 150) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Shop name is required (max 150)");
        }
        Shop shop = new Shop();
        shop.setName(name);
        applyAddressFields(shop, body);
        shop.setOwnerUserId(principal.userId());
        shop.setStatus(ShopStatus.OPEN);
        Object color = body.get("supportsColor");
        shop.setSupportsColor(color == null || Boolean.parseBoolean(String.valueOf(color)));
        return toDto(shops.save(shop));
    }

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

    @RequestMapping(value = "/{id}", method = {RequestMethod.PATCH, RequestMethod.PUT, RequestMethod.POST})
    public ShopSummaryDto update(@AuthenticationPrincipal InkoPrincipal principal,
                                 @PathVariable UUID id,
                                 @RequestBody(required = false) Map<String, Object> body) {
        if (body == null) body = Map.of();
        requireKeeper(principal);
        Shop shop = shops.findById(id).orElseThrow(() -> ApiException.notFound("Shop not found"));
        if (!principal.userId().equals(shop.getOwnerUserId())) {
            boolean isAdmin = principal.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
            if (!isAdmin) throw ApiException.forbidden("You do not manage this shop");
        }
        if (body.containsKey("name")) {
            String n = str(body.get("name"));
            if (n.isEmpty() || n.length() > 150) throw new ApiException(ErrorCode.VALIDATION_FAILED, "Shop name is required (max 150)");
            shop.setName(n);
        }
        applyAddressFields(shop, body);
        if (body.containsKey("supportsColor")) shop.setSupportsColor(Boolean.parseBoolean(String.valueOf(body.get("supportsColor"))));
        if (body.containsKey("status")) {
            try { shop.setStatus(ShopStatus.valueOf(String.valueOf(body.get("status")))); } catch (Exception ignored) {}
        }
        return toDto(shops.save(shop));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal InkoPrincipal principal,
                       @PathVariable UUID id,
                       @RequestBody(required = false) Map<String, String> body) {
        requireKeeper(principal);
        Shop shop = shops.findById(id).orElseThrow(() -> ApiException.notFound("Shop not found"));
        if (!principal.userId().equals(shop.getOwnerUserId())) {
            throw ApiException.forbidden("You do not manage this shop");
        }
        String password = body == null ? null : body.get("password");
        if (password == null || password.isBlank()) throw new ApiException(ErrorCode.VALIDATION_FAILED, "Password is required to delete shop");
        var user = users.findById(principal.userId()).orElseThrow(() -> ApiException.notFound("User not found"));
        if (user.getPasswordHash() == null || !encoder.matches(password, user.getPasswordHash())) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS, "Incorrect password");
        }
        shops.delete(shop);
    }

    private void applyAddressFields(Shop shop, Map<String, Object> body) {
        if (body.containsKey("addressLine1")) shop.setAddressLine1(trimOrNull(body.get("addressLine1"), 200));
        if (body.containsKey("addressLine2")) shop.setAddressLine2(trimOrNull(body.get("addressLine2"), 200));
        if (body.containsKey("city")) shop.setCity(trimOrNull(body.get("city"), 80));
        if (body.containsKey("state")) shop.setState(trimOrNull(body.get("state"), 80));
        if (body.containsKey("pincode")) {
            String p = trimOrNull(body.get("pincode"), 12);
            if (p != null && !p.matches("\\d{5,6}")) throw new ApiException(ErrorCode.VALIDATION_FAILED, "Pincode must be 5-6 digits");
            shop.setPincode(p);
        }
        if (body.containsKey("phone")) shop.setPhone(trimOrNull(body.get("phone"), 20));
        if (body.containsKey("email")) shop.setEmail(trimOrNull(body.get("email"), 180));
        if (body.containsKey("latitude")) shop.setLatitude(parseDouble(body.get("latitude")));
        if (body.containsKey("longitude")) shop.setLongitude(parseDouble(body.get("longitude")));
        if (shop.getLatitude() != null && (shop.getLatitude() < -90 || shop.getLatitude() > 90))
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Invalid latitude");
        if (shop.getLongitude() != null && (shop.getLongitude() < -180 || shop.getLongitude() > 180))
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Invalid longitude");
        boolean hasAddress = shop.getAddressLine1() != null && !shop.getAddressLine1().isBlank();
        boolean hasCity = shop.getCity() != null && !shop.getCity().isBlank();
        if (hasAddress && !hasCity) throw new ApiException(ErrorCode.VALIDATION_FAILED, "City is required when address is provided");
        if (shop.getLatitude() != null ^ shop.getLongitude() != null)
            throw new ApiException(ErrorCode.VALIDATION_FAILED, "Provide both latitude and longitude together");
    }

    private static String str(Object o) { return o == null ? "" : String.valueOf(o).trim(); }
    private static String trimOrNull(Object o, int max) {
        if (o == null) return null;
        String s = String.valueOf(o).trim();
        if (s.isEmpty()) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }
    private static Double parseDouble(Object o) {
        if (o == null || String.valueOf(o).trim().isEmpty()) return null;
        try { return Double.parseDouble(String.valueOf(o).trim()); } catch (Exception e) { throw new ApiException(ErrorCode.VALIDATION_FAILED, "Invalid coordinate"); }
    }

    private static ShopSummaryDto toDto(Shop s) {
        return new ShopSummaryDto(s.getId(), s.getName(), s.getCity(), s.getStatus(),
                s.isSupportsColor(), s.getAddressLine1(), s.getAddressLine2(), s.getState(), s.getPincode(),
                s.getLatitude(), s.getLongitude(), s.getPhone(), s.getEmail());
    }

    private static void requireKeeper(InkoPrincipal principal) {
        boolean allowed = principal.getAuthorities().stream().anyMatch(a -> {
            String r = a.getAuthority();
            return r.equals("ROLE_" + RoleName.SHOPKEEPER.name())
                    || r.equals("ROLE_" + RoleName.ADMIN.name())
                    || r.equals("ROLE_" + RoleName.SUPER_ADMIN.name());
        });
        if (!allowed) throw ApiException.forbidden("Only shop owners can manage shops");
    }
}
