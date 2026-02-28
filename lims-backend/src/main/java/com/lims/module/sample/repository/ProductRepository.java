package com.lims.module.sample.repository;

import com.lims.module.sample.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findByCode(String code);
    Optional<Product> findByName(String name);
    List<Product> findByActiveTrueOrderByNameAsc();
}
