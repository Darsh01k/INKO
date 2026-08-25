package com.inko.catalog.repo;

import com.inko.catalog.domain.Printer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PrinterRepository extends JpaRepository<Printer, UUID> {
    List<Printer> findByShopIdOrderByNameAsc(UUID shopId);
    long countByShopIdAndStatusIn(UUID shopId, List<Printer.PrinterStatus> statuses);
}
