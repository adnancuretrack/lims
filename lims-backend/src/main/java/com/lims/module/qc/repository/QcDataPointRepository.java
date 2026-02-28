package com.lims.module.qc.repository;

import com.lims.module.qc.entity.QcDataPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface QcDataPointRepository extends JpaRepository<QcDataPoint, Long> {

    List<QcDataPoint> findByChartIdOrderByMeasuredAtAsc(Long chartId);

    long countByChartIdAndViolationTrue(Long chartId);

    @Query("""
        SELECT COUNT(dp) FROM QcDataPoint dp
        WHERE dp.violation = true
          AND dp.measuredAt >= :since
    """)
    long countViolationsSince(@Param("since") Instant since);

    @Query("""
        SELECT dp FROM QcDataPoint dp
        WHERE dp.chart.id = :chartId
        ORDER BY dp.measuredAt DESC
        LIMIT :limit
    """)
    List<QcDataPoint> findRecentByChartId(@Param("chartId") Long chartId, @Param("limit") int limit);
}
