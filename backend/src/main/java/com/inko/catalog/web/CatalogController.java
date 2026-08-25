package com.inko.catalog.web;

import com.inko.catalog.domain.Printer;
import com.inko.catalog.domain.ShopPaperInventory;
import com.inko.catalog.repo.PrinterRepository;
import com.inko.catalog.repo.ShopPaperInventoryRepository;
import com.inko.common.error.ApiException;
import com.inko.identity.security.AppUserDetailsService.InkoPrincipal;
import com.inko.shops.repo.ShopRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Printer + paper-inventory management for a shop.
 * Shopkeepers manage their own shop; admins manage any shop.
 */
@RestController
@RequestMapping("/api/shops/{shopId}")
public class CatalogController {

    private final PrinterRepository printers;
    private final ShopPaperInventoryRepository inventory;
    private final ShopRepository shops;

    public CatalogController(PrinterRepository printers, ShopPaperInventoryRepository inventory, ShopRepository shops) {
        this.printers = printers;
        this.inventory = inventory;
        this.shops = shops;
    }

    // ---------- Printers ----------

    @GetMapping("/printers")
    public List<Printer> listPrinters(@PathVariable UUID shopId) {
        return printers.findByShopIdOrderByNameAsc(shopId);
    }

    @PostMapping("/printers")
    @ResponseStatus(HttpStatus.CREATED)
    public Printer createPrinter(@AuthenticationPrincipal InkoPrincipal p,
                                 @PathVariable UUID shopId,
                                 @RequestBody Map<String, Object> body) {
        requireAccess(p, shopId);
        String name = String.valueOf(body.getOrDefault("name", "")).trim();
        if (name.isEmpty()) throw new ApiException(com.inko.common.error.ErrorCode.VALIDATION_FAILED, "Printer name is required");
        Printer pr = new Printer();
        pr.setShopId(shopId);
        pr.setName(name);
        Object model = body.get("model");
        if (model != null) pr.setModel(String.valueOf(model));
        pr.setColorCapable(Boolean.TRUE.equals(body.get("colorCapable")));
        applyPaperSizes(pr, body.get("paperSizes"));
        Object status = body.get("status");
        if (status != null) pr.setStatus(parseStatus(String.valueOf(status)));
        return printers.save(pr);
    }

    @PatchMapping("/printers/{printerId}")
    public Printer updatePrinter(@AuthenticationPrincipal InkoPrincipal p,
                                 @PathVariable UUID shopId,
                                 @PathVariable UUID printerId,
                                 @RequestBody Map<String, Object> body) {
        requireAccess(p, shopId);
        Printer pr = printers.findById(printerId).orElseThrow(() -> ApiException.notFound("Printer not found"));
        if (!pr.getShopId().equals(shopId)) throw ApiException.notFound("Printer not found");
        if (body.containsKey("name") && !String.valueOf(body.get("name")).isBlank()) pr.setName(String.valueOf(body.get("name")));
        if (body.containsKey("model")) pr.setModel(body.get("model") == null ? null : String.valueOf(body.get("model")));
        if (body.containsKey("status")) pr.setStatus(parseStatus(String.valueOf(body.get("status"))));
        if (body.containsKey("errorMessage")) pr.setErrorMessage(body.get("errorMessage") == null ? null : String.valueOf(body.get("errorMessage")));
        if (body.containsKey("maintenanceNotes")) pr.setMaintenanceNotes(body.get("maintenanceNotes") == null ? null : String.valueOf(body.get("maintenanceNotes")));
        if (body.containsKey("colorCapable")) pr.setColorCapable(Boolean.TRUE.equals(body.get("colorCapable")));
        if (body.containsKey("paperSizes")) applyPaperSizes(pr, body.get("paperSizes"));
        if (body.containsKey("heartbeat")) pr.setLastHeartbeat(Instant.now());
        return printers.save(pr);
    }

    @DeleteMapping("/printers/{printerId}")
    public ResponseEntity<Void> deletePrinter(@AuthenticationPrincipal InkoPrincipal p,
                                              @PathVariable UUID shopId,
                                              @PathVariable UUID printerId) {
        requireAccess(p, shopId);
        Printer pr = printers.findById(printerId).orElseThrow(() -> ApiException.notFound("Printer not found"));
        if (!pr.getShopId().equals(shopId)) throw ApiException.notFound("Printer not found");
        printers.delete(pr);
        return ResponseEntity.noContent().build();
    }

    // ---------- Paper inventory ----------

    @GetMapping("/inventory")
    public List<ShopPaperInventory> listInventory(@PathVariable UUID shopId) {
        return inventory.findByShopIdOrderByPaperSizeAscGsmAsc(shopId);
    }

    @PutMapping("/inventory")
    public ShopPaperInventory upsertInventory(@AuthenticationPrincipal InkoPrincipal p,
                                              @PathVariable UUID shopId,
                                              @RequestBody Map<String, Object> body) {
        requireAccess(p, shopId);
        String paperSize = String.valueOf(body.getOrDefault("paperSize", "A4"));
        Integer gsm = body.get("gsm") == null ? null : Integer.valueOf(String.valueOf(body.get("gsm")));
        ShopPaperInventory row = inventory.findByShopIdAndPaperSizeAndGsm(shopId, paperSize, gsm)
                .orElseGet(() -> {
                    ShopPaperInventory n = new ShopPaperInventory();
                    n.setShopId(shopId); n.setPaperSize(paperSize); n.setGsm(gsm);
                    return n;
                });
        if (body.containsKey("quantitySheets")) row.setQuantitySheets(Integer.parseInt(String.valueOf(body.get("quantitySheets"))));
        if (body.containsKey("lowStockThreshold")) row.setLowStockThreshold(Integer.parseInt(String.valueOf(body.get("lowStockThreshold"))));
        if (body.containsKey("isAvailable")) row.setAvailable(Boolean.TRUE.equals(body.get("isAvailable")));
        return inventory.save(row);
    }

    @DeleteMapping("/inventory/{rowId}")
    public ResponseEntity<Void> deleteInventory(@AuthenticationPrincipal InkoPrincipal p,
                                                @PathVariable UUID shopId,
                                                @PathVariable UUID rowId) {
        requireAccess(p, shopId);
        ShopPaperInventory row = inventory.findById(rowId).orElseThrow(() -> ApiException.notFound("Inventory row not found"));
        if (!row.getShopId().equals(shopId)) throw ApiException.notFound("Inventory row not found");
        inventory.delete(row);
        return ResponseEntity.noContent().build();
    }

    // ---------- helpers ----------

    private void requireAccess(InkoPrincipal p, UUID shopId) {
        boolean admin = p != null && p.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        if (admin) return;
        if (p == null || !shops.existsByOwnerUserIdAndId(p.userId(), shopId)) {
            throw ApiException.forbidden("You do not manage this shop");
        }
    }

    private void applyPaperSizes(Printer pr, Object raw) {
        pr.getPaperSizes().clear();
        if (raw instanceof List<?> list) {
            list.forEach(s -> pr.getPaperSizes().add(String.valueOf(s)));
        }
    }

    private Printer.PrinterStatus parseStatus(String s) {
        try { return Printer.PrinterStatus.valueOf(s); }
        catch (IllegalArgumentException e) { throw new ApiException(com.inko.common.error.ErrorCode.VALIDATION_FAILED, "Invalid printer status: " + s); }
    }
}
