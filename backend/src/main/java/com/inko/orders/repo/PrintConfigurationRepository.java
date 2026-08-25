package com.inko.orders.repo;

import com.inko.orders.domain.PrintConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PrintConfigurationRepository extends JpaRepository<PrintConfiguration, UUID> {}
