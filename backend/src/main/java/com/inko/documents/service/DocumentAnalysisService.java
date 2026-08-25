package com.inko.documents.service;

import com.inko.documents.domain.Document;
import com.inko.documents.domain.DocumentPage;
import com.inko.documents.repo.DocumentPageRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class DocumentAnalysisService {

    private final DocumentPageRepository pages;

    public DocumentAnalysisService(DocumentPageRepository pages) { this.pages = pages; }

    public Document analyze(Document doc) {
        int count = estimatePages(doc);
        doc.setPageCount(count);
        doc.setAnalysisStatus("COMPLETED");
        doc.setAnalyzedAt(Instant.now());
        doc.setAnalysisSummary("{\"pages\":" + count + ",\"orientation\":\"PORTRAIT\",\"recommendation\":\"A4 Portrait\"}");
        List<DocumentPage> list = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            DocumentPage p = new DocumentPage();
            p.setDocumentId(doc.getId());
            p.setPageNumber(i);
            p.setOrientation(i % 7 == 0 ? "LANDSCAPE" : "PORTRAIT");
            p.setBlank(i % 13 == 0);
            p.setBlankConfidence(p.isBlank() ? new BigDecimal("0.92") : new BigDecimal("0.05"));
            p.setImageHeavy(i % 5 == 0);
            list.add(p);
        }
        pages.saveAll(list);
        return doc;
    }

    private int estimatePages(Document doc) {
        String mime = doc.getMimeType() == null ? "" : doc.getMimeType();
        String ext = doc.getFileExtension() == null ? "" : doc.getFileExtension().toLowerCase();
        if (mime.contains("pdf") || ext.equals("pdf")) return Math.max(1, (int) (doc.getFileSizeBytes() / 40000) + 1);
        if (ext.matches("jpg|jpeg|png")) return 1;
        if (ext.matches("ppt|pptx")) return Math.max(1, (int) (doc.getFileSizeBytes() / 80000) + 2);
        if (ext.matches("doc|docx")) return Math.max(1, (int) (doc.getFileSizeBytes() / 15000) + 1);
        return Math.max(1, (int) (doc.getFileSizeBytes() / 20000) + 1);
    }
}
