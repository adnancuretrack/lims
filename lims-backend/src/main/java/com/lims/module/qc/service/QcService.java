package com.lims.module.qc.service;

import com.lims.module.qc.dto.*;
import com.lims.module.qc.entity.QcChart;
import com.lims.module.qc.entity.QcDataPoint;
import com.lims.module.qc.repository.QcChartRepository;
import com.lims.module.qc.repository.QcDataPointRepository;
import com.lims.module.sample.entity.TestMethod;
import com.lims.module.sample.repository.TestMethodRepository;
import com.lims.module.security.entity.User;
import com.lims.module.security.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QcService {

    private final QcChartRepository chartRepository;
    private final QcDataPointRepository dataPointRepository;
    private final TestMethodRepository testMethodRepository;
    private final UserRepository userRepository;

    // ==================== Chart CRUD ====================

    @Transactional
    public QcChartDTO createChart(CreateQcChartRequest request) {
        TestMethod testMethod = testMethodRepository.findById(request.getTestMethodId())
                .orElseThrow(() -> new RuntimeException("Test method not found"));

        QcChart chart = QcChart.builder()
                .name(request.getName())
                .testMethod(testMethod)
                .instrumentId(request.getInstrumentId())
                .chartType(request.getChartType() != null ? request.getChartType() : "XBAR_R")
                .targetValue(request.getTargetValue())
                .ucl(request.getUcl())
                .lcl(request.getLcl())
                .usl(request.getUsl())
                .lsl(request.getLsl())
                .build();

        chart = chartRepository.save(chart);
        return toChartDTO(chart, false);
    }

    @Transactional(readOnly = true)
    public List<QcChartDTO> listCharts() {
        return chartRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(c -> toChartDTO(c, false))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public QcChartDTO getChartWithData(Long chartId) {
        QcChart chart = chartRepository.findById(chartId)
                .orElseThrow(() -> new RuntimeException("QC Chart not found"));
        return toChartDTO(chart, true);
    }

    // ==================== Data Points ====================

    @Transactional
    public QcDataPointDTO addDataPoint(Long chartId, AddDataPointRequest request) {
        QcChart chart = chartRepository.findById(chartId)
                .orElseThrow(() -> new RuntimeException("QC Chart not found"));

        // Resolve current user
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElse(null);

        QcDataPoint dp = QcDataPoint.builder()
                .chart(chart)
                .measuredValue(request.getMeasuredValue())
                .measuredAt(Instant.now())
                .measuredBy(user)
                .lotId(request.getLotId())
                .notes(request.getNotes())
                .build();

        // Check Westgard rules
        List<QcDataPoint> recentPoints = dataPointRepository.findRecentByChartId(chartId, 9);
        List<String> violations = checkWestgardRules(dp, recentPoints, chart);

        if (!violations.isEmpty()) {
            dp.setViolation(true);
            dp.setViolationRule(String.join(", ", violations));
        }

        dp = dataPointRepository.save(dp);
        return toDataPointDTO(dp);
    }

    // ==================== Statistics ====================

    @Transactional(readOnly = true)
    public QcChartStatsDTO getChartStatistics(Long chartId) {
        QcChart chart = chartRepository.findById(chartId)
                .orElseThrow(() -> new RuntimeException("QC Chart not found"));

        List<QcDataPoint> points = dataPointRepository.findByChartIdOrderByMeasuredAtAsc(chartId);
        long violationCount = dataPointRepository.countByChartIdAndViolationTrue(chartId);

        if (points.isEmpty()) {
            return QcChartStatsDTO.builder()
                    .chartId(chartId)
                    .chartName(chart.getName())
                    .totalPoints(0)
                    .violationCount(0)
                    .mean(BigDecimal.ZERO)
                    .standardDeviation(BigDecimal.ZERO)
                    .cpk(BigDecimal.ZERO)
                    .inControl(true)
                    .build();
        }

        // Calculate mean
        BigDecimal sum = points.stream()
                .map(QcDataPoint::getMeasuredValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal mean = sum.divide(BigDecimal.valueOf(points.size()), 6, RoundingMode.HALF_UP);

        // Calculate standard deviation
        BigDecimal varianceSum = points.stream()
                .map(p -> p.getMeasuredValue().subtract(mean).pow(2))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal variance = varianceSum.divide(BigDecimal.valueOf(points.size()), 6, RoundingMode.HALF_UP);
        BigDecimal sd = variance.sqrt(new MathContext(6));

        // Calculate Cpk (if USL and LSL are defined)
        BigDecimal cpk = BigDecimal.ZERO;
        if (chart.getUsl() != null && chart.getLsl() != null && sd.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal cpUpper = chart.getUsl().subtract(mean)
                    .divide(sd.multiply(BigDecimal.valueOf(3)), 4, RoundingMode.HALF_UP);
            BigDecimal cpLower = mean.subtract(chart.getLsl())
                    .divide(sd.multiply(BigDecimal.valueOf(3)), 4, RoundingMode.HALF_UP);
            cpk = cpUpper.min(cpLower);
        }

        // "In control" if no violations in the last 10 points
        List<QcDataPoint> lastTen = dataPointRepository.findRecentByChartId(chartId, 10);
        boolean inControl = lastTen.stream().noneMatch(QcDataPoint::isViolation);

        return QcChartStatsDTO.builder()
                .chartId(chartId)
                .chartName(chart.getName())
                .totalPoints(points.size())
                .violationCount(violationCount)
                .mean(mean.setScale(4, RoundingMode.HALF_UP))
                .standardDeviation(sd.setScale(4, RoundingMode.HALF_UP))
                .cpk(cpk)
                .inControl(inControl)
                .build();
    }

    // ==================== Westgard Rules ====================

    /**
     * Checks common Westgard multi-rules against the new data point + recent history.
     * Rules implemented:
     * - 1-3s: A single point exceeds ±3 SD from the mean (beyond UCL/LCL)
     * - 2-2s: Two consecutive points exceed ±2 SD on the same side
     * - R-4s: Two consecutive points span a range > 4 SD (one above +2s, one below -2s)
     * - 4-1s: Four consecutive points exceed ±1 SD on the same side
     * - 10-x: Ten consecutive points on the same side of the mean
     */
    private List<String> checkWestgardRules(QcDataPoint newPoint, List<QcDataPoint> recentHistory, QcChart chart) {
        List<String> violations = new ArrayList<>();

        BigDecimal value = newPoint.getMeasuredValue();
        BigDecimal ucl = chart.getUcl();
        BigDecimal lcl = chart.getLcl();
        BigDecimal target = chart.getTargetValue();

        if (ucl == null || lcl == null || target == null) {
            // Can't check Westgard rules without limits and target
            return violations;
        }

        // Calculate SD from control limits (UCL = mean + 3*SD)
        BigDecimal threeSD = ucl.subtract(target);
        if (threeSD.compareTo(BigDecimal.ZERO) <= 0) return violations;

        BigDecimal oneSD = threeSD.divide(BigDecimal.valueOf(3), 6, RoundingMode.HALF_UP);
        BigDecimal twoSD = oneSD.multiply(BigDecimal.valueOf(2));

        BigDecimal plus1s = target.add(oneSD);
        BigDecimal minus1s = target.subtract(oneSD);
        BigDecimal plus2s = target.add(twoSD);
        BigDecimal minus2s = target.subtract(twoSD);

        // === 1-3s Rule: single point beyond ±3 SD ===
        if (value.compareTo(ucl) > 0 || value.compareTo(lcl) < 0) {
            violations.add("1-3s");
        }

        // Build combined list (newest first): newPoint + recentHistory
        List<BigDecimal> values = new ArrayList<>();
        values.add(value);
        for (QcDataPoint dp : recentHistory) {
            values.add(dp.getMeasuredValue());
        }

        // === 2-2s Rule: 2 consecutive points > ±2 SD on same side ===
        if (values.size() >= 2) {
            boolean bothAbove2s = values.get(0).compareTo(plus2s) > 0 && values.get(1).compareTo(plus2s) > 0;
            boolean bothBelow2s = values.get(0).compareTo(minus2s) < 0 && values.get(1).compareTo(minus2s) < 0;
            if (bothAbove2s || bothBelow2s) {
                violations.add("2-2s");
            }
        }

        // === R-4s Rule: 2 consecutive points with range > 4 SD ===
        if (values.size() >= 2) {
            boolean oneAboveOneBelow = (values.get(0).compareTo(plus2s) > 0 && values.get(1).compareTo(minus2s) < 0)
                    || (values.get(0).compareTo(minus2s) < 0 && values.get(1).compareTo(plus2s) > 0);
            if (oneAboveOneBelow) {
                violations.add("R-4s");
            }
        }

        // === 4-1s Rule: 4 consecutive points beyond ±1 SD on same side ===
        if (values.size() >= 4) {
            boolean allAbove1s = values.subList(0, 4).stream().allMatch(v -> v.compareTo(plus1s) > 0);
            boolean allBelow1s = values.subList(0, 4).stream().allMatch(v -> v.compareTo(minus1s) < 0);
            if (allAbove1s || allBelow1s) {
                violations.add("4-1s");
            }
        }

        // === 10-x Rule: 10 consecutive points on same side of mean ===
        if (values.size() >= 10) {
            boolean allAboveMean = values.subList(0, 10).stream().allMatch(v -> v.compareTo(target) > 0);
            boolean allBelowMean = values.subList(0, 10).stream().allMatch(v -> v.compareTo(target) < 0);
            if (allAboveMean || allBelowMean) {
                violations.add("10-x");
            }
        }

        return violations;
    }

    // ==================== Mappers ====================

    private QcChartDTO toChartDTO(QcChart chart, boolean includeDataPoints) {
        QcChartDTO.QcChartDTOBuilder builder = QcChartDTO.builder()
                .id(chart.getId())
                .name(chart.getName())
                .testMethodId(chart.getTestMethod().getId())
                .testMethodName(chart.getTestMethod().getName())
                .instrumentId(chart.getInstrumentId())
                .chartType(chart.getChartType())
                .targetValue(chart.getTargetValue())
                .ucl(chart.getUcl())
                .lcl(chart.getLcl())
                .usl(chart.getUsl())
                .lsl(chart.getLsl())
                .active(chart.isActive())
                .createdAt(chart.getCreatedAt());

        if (includeDataPoints) {
            builder.dataPoints(chart.getDataPoints().stream()
                    .map(this::toDataPointDTO)
                    .collect(Collectors.toList()));
        }

        return builder.build();
    }

    private QcDataPointDTO toDataPointDTO(QcDataPoint dp) {
        return QcDataPointDTO.builder()
                .id(dp.getId())
                .measuredValue(dp.getMeasuredValue())
                .measuredAt(dp.getMeasuredAt())
                .measuredByName(dp.getMeasuredBy() != null ? dp.getMeasuredBy().getDisplayName() : null)
                .lotId(dp.getLotId())
                .violation(dp.isViolation())
                .violationRule(dp.getViolationRule())
                .notes(dp.getNotes())
                .build();
    }
}
