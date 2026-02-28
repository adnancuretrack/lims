package com.lims.module.qc.repository;

import com.lims.module.qc.entity.QcChart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QcChartRepository extends JpaRepository<QcChart, Long> {

    List<QcChart> findByActiveOrderByCreatedAtDesc(boolean active);

    List<QcChart> findAllByOrderByCreatedAtDesc();

    @Query("""
        SELECT c FROM QcChart c
        LEFT JOIN FETCH c.testMethod
        WHERE c.id = :id
    """)
    Optional<QcChart> findByIdWithTestMethod(Long id);

    List<QcChart> findByTestMethodId(Long testMethodId);
}
