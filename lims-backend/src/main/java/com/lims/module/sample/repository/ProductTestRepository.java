package com.lims.module.sample.repository;

import com.lims.module.sample.entity.ProductTest;
import com.lims.module.sample.entity.ProductTestId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductTestRepository extends JpaRepository<ProductTest, ProductTestId> {
    List<ProductTest> findByProductId(Long productId);
    void deleteByProductId(Long productId);
}
