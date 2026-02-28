package com.lims.module.sample.repository;

import com.lims.module.sample.entity.Sample;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface SampleRepository extends JpaRepository<Sample, Long> {
    Optional<Sample> findBySampleNumber(String sampleNumber);
    Optional<Sample> findByBarcode(String barcode);
    List<Sample> findByJobId(Long jobId);

    // Status-based counts for dashboard
    long countByStatus(String status);

    Page<Sample> findByOrderByCreatedAtDesc(Pageable pageable);

    // --- Report queries ---

    /** Group samples by status with TAT aggregates (hours between createdAt and updatedAt) */
    @Query("""
        SELECT s.status,
               COUNT(s),
               COALESCE(AVG(timestampdiff(SECOND, s.createdAt, s.updatedAt)) / 3600.0, 0),
               COALESCE(MIN(timestampdiff(SECOND, s.createdAt, s.updatedAt)) / 3600.0, 0),
               COALESCE(MAX(timestampdiff(SECOND, s.createdAt, s.updatedAt)) / 3600.0, 0)
        FROM Sample s
        GROUP BY s.status
        ORDER BY COUNT(s) DESC
    """)
    List<Object[]> getTatStatsByStatus();

    /** All samples past their due date that are not in a terminal status */
    @Query("""
        SELECT s FROM Sample s
        LEFT JOIN FETCH s.job j
        LEFT JOIN FETCH j.client
        LEFT JOIN FETCH s.product
        LEFT JOIN FETCH s.assignedTo
        WHERE s.dueDate < :now
          AND s.status NOT IN ('AUTHORIZED', 'REJECTED', 'CANCELLED')
        ORDER BY s.dueDate ASC
    """)
    List<Sample> findOverdueSamples(@Param("now") Instant now);

    /** Find all distinct statuses in the system */
    @Query("SELECT DISTINCT s.status FROM Sample s")
    List<String> findDistinctStatuses();
}
