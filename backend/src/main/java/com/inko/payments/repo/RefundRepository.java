package com.inko.payments.repo;

import com.inko.payments.domain.Refund;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RefundRepository extends JpaRepository<Refund, UUID> {
    List<Refund> findByOrderId(UUID orderId);
    List<Refund> findByPaymentId(UUID paymentId);
}
