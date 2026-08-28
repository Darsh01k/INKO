package com.inko.orders.repo;

import com.inko.orders.domain.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);
    List<Order> findByShopIdOrderByCreatedAtDesc(UUID shopId);
    List<Order> findByStatus(String status);
    long countByShopId(UUID shopId);
}
