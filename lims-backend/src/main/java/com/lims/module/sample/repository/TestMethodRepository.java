package com.lims.module.sample.repository;

import com.lims.module.sample.entity.TestMethod;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TestMethodRepository extends JpaRepository<TestMethod, Long> {
    Optional<TestMethod> findByCode(String code);
    List<TestMethod> findByActiveTrueOrderByNameAsc();
}
