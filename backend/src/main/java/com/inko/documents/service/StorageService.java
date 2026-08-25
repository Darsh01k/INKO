package com.inko.documents.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Service
public class StorageService {

    private final Path root;

    public StorageService(@Value("${inko.app.storage.root:./data/storage}") String root) {
        this.root = Path.of(root);
    }

    public String store(MultipartFile file, UUID ownerId) throws IOException {
        Files.createDirectories(root);
        String ext = originalExt(file.getOriginalFilename());
        String key = ownerId + "/" + UUID.randomUUID() + (ext.isEmpty() ? "" : "." + ext);
        Path dest = root.resolve(key);
        Files.createDirectories(dest.getParent());
        file.transferTo(dest);
        return key;
    }

    public Path resolve(String storageKey) { return root.resolve(storageKey); }

    private String originalExt(String name) {
        if (name == null || !name.contains(".")) return "";
        return name.substring(name.lastIndexOf('.') + 1).toLowerCase();
    }
}
