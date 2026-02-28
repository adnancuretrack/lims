package com.lims.module.sample.repository;

import com.lims.module.sample.entity.SampleTest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SampleTestRepository extends JpaRepository<SampleTest, Long> {
    List<SampleTest> findBySampleIdOrderBySortOrderAscIdAsc(Long sampleId);
    List<SampleTest> findByStatus(String status);

    /** Workload report: group tests by analyst's displayName */
    @Query("""
        SELECT u.displayName,
               COUNT(DISTINCT st.sample.id),
               SUM(CASE WHEN st.status IN ('COMPLETED', 'AUTHORIZED') THEN 1 ELSE 0 END),
               SUM(CASE WHEN st.status IN ('PENDING', 'IN_PROGRESS') THEN 1 ELSE 0 END)
        FROM SampleTest st
        JOIN st.assignedTo u
        GROUP BY u.displayName
        ORDER BY COUNT(DISTINCT st.sample.id) DESC
    """)
    List<Object[]> getWorkloadByAnalyst();
}
