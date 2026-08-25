package com.inko.documents.repo;

import com.inko.documents.domain.DocumentPage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentPageRepository extends JpaRepository<DocumentPage, UUID> {
    List<DocumentPage> findByDocumentIdOrderByPageNumberAsc(UUID documentId);
}
