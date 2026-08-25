package com.inko.documents.web;

import com.inko.documents.domain.Document;
import com.inko.documents.repo.DocumentRepository;
import com.inko.documents.repo.DocumentPageRepository;
import com.inko.documents.service.DocumentAnalysisService;
import com.inko.documents.service.StorageService;
import com.inko.identity.security.AppUserDetailsService.InkoPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private static final Set<String> ALLOWED_EXT = Set.of("pdf","jpg","jpeg","png","doc","docx","ppt","pptx","xls","xlsx","txt");
    private static final long MAX_SIZE = 50 * 1024 * 1024;

    private final DocumentRepository docs;
    private final DocumentPageRepository pages;
    private final StorageService storage;
    private final DocumentAnalysisService analysis;

    public DocumentController(DocumentRepository docs, DocumentPageRepository pages, StorageService storage, DocumentAnalysisService analysis) {
        this.docs = docs; this.pages = pages; this.storage = storage; this.analysis = analysis;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@AuthenticationPrincipal InkoPrincipal p,
                                    @RequestParam("files") List<MultipartFile> files) throws Exception {
        if (files == null || files.isEmpty()) return ResponseEntity.badRequest().body(java.util.Map.of("message","No files"));
        var out = new java.util.ArrayList<>();
        for (MultipartFile f : files) {
            String ext = extOf(f.getOriginalFilename());
            if (!ALLOWED_EXT.contains(ext)) return ResponseEntity.badRequest().body(java.util.Map.of("message","Unsupported file type: " + ext));
            if (f.getSize() > MAX_SIZE) return ResponseEntity.badRequest().body(java.util.Map.of("message","File too large"));
            if (f.getSize() == 0) return ResponseEntity.badRequest().body(java.util.Map.of("message","Empty file"));
            String key = storage.store(f, p.userId());
            Document d = new Document();
            d.setCustomerId(p.userId());
            d.setOriginalFilename(f.getOriginalFilename());
            d.setStorageKey(key);
            d.setMimeType(f.getContentType());
            d.setFileExtension(ext);
            d.setFileSizeBytes(f.getSize());
            d.setChecksumSha256(sha256(f.getBytes()));
            d = docs.save(d);
            d = analysis.analyze(d);
            docs.save(d);
            out.add(java.util.Map.of("id", d.getId(), "filename", d.getOriginalFilename(), "pages", d.getPageCount(), "status", d.getAnalysisStatus()));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(out);
    }

    @GetMapping
    public List<?> list(@AuthenticationPrincipal InkoPrincipal p) {
        return docs.findByCustomerIdOrderByCreatedAtDesc(p.userId()).stream().map(d ->
                java.util.Map.of("id", d.getId(), "filename", d.getOriginalFilename(), "pages", d.getPageCount() == null ? 0 : d.getPageCount(), "size", d.getFileSizeBytes(), "analysisStatus", d.getAnalysisStatus(), "uploadedAt", d.getCreatedAt().toString())
        ).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@AuthenticationPrincipal InkoPrincipal p, @PathVariable UUID id) {
        var d = docs.findById(id).orElse(null);
        if (d == null) return ResponseEntity.notFound().build();
        if (!d.getCustomerId().equals(p.userId())) return ResponseEntity.status(403).body(java.util.Map.of("message","Not your document"));
        var pg = pages.findByDocumentIdOrderByPageNumberAsc(id);
        return ResponseEntity.ok(java.util.Map.of("document", d, "pages", pg));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<?> download(@AuthenticationPrincipal InkoPrincipal p, @PathVariable UUID id) throws IOException {
        var d = docs.findById(id).orElse(null);
        if (d == null) return ResponseEntity.notFound().build();
        if (!d.getCustomerId().equals(p.userId())) return ResponseEntity.status(403).build();
        var path = storage.resolve(d.getStorageKey());
        if (!Files.exists(path)) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().header("Content-Disposition", "attachment; filename=\"" + d.getOriginalFilename() + "\"").body(Files.readAllBytes(path));
    }

    private String extOf(String name) {
        if (name == null || !name.contains(".")) return "";
        return name.substring(name.lastIndexOf('.') + 1).toLowerCase();
    }
    private String sha256(byte[] b) throws Exception {
        var md = MessageDigest.getInstance("SHA-256");
        return HexFormat.of().formatHex(md.digest(b));
    }
}
