package com.lims.module.sample.repository;

import com.lims.module.sample.entity.TestResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestResultRepository extends JpaRepository<TestResult, Long> {
    List<TestResult> findBySampleTestIdOrderByEnteredAtDesc(Long sampleTestId);
}
