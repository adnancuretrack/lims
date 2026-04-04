package com.lims.module.sample.service;

import com.lims.module.sample.entity.Sample;
import com.lims.module.sample.entity.WorksheetData;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelReportService {

    private static final Pattern TAG_PATTERN = Pattern.compile("\\{([^}]+)\\}");

    /**
     * Injects worksheet data into an Excel template.
     * 
     * @param worksheetData The source data
     * @param templatePath Path to the .xlsx template
     * @return Path to the generated temporary Excel file
     */
    public Path generateExcelReport(WorksheetData worksheetData, String templatePath) throws IOException {
        Path inputPath = Path.of(templatePath);
        if (!Files.exists(inputPath)) {
            throw new IOException("Template file not found at: " + templatePath);
        }

        try (FileInputStream fis = new FileInputStream(templatePath);
             Workbook workbook = new XSSFWorkbook(fis)) {

            log.info("Generating Excel report for SampleTest: {} using template: {}", 
                worksheetData.getSampleTest().getId(), templatePath);

            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                Sheet sheet = workbook.getSheetAt(i);
                for (Row row : sheet) {
                    for (Cell cell : row) {
                        processCell(cell, worksheetData);
                    }
                }
            }

            // Force formula recalculation so POI/Excel updates derived cells
            workbook.getCreationHelper().createFormulaEvaluator().evaluateAll();

            Path tempDir = Files.createTempDirectory("lims_reports");
            Path outputPath = tempDir.resolve("report_" + worksheetData.getSampleTest().getId() + "_" + System.currentTimeMillis() + ".xlsx");
            
            try (FileOutputStream fos = new FileOutputStream(outputPath.toFile())) {
                workbook.write(fos);
            }
            
            return outputPath;
        }
    }

    private void processCell(Cell cell, WorksheetData wd) {
        if (cell.getCellType() != CellType.STRING) return;

        String originalValue = cell.getStringCellValue();
        if (originalValue == null || !originalValue.contains("{")) return;

        // Case 1: Entire cell is a single tag (e.g. "{table.0.mass}")
        // We do this to preserve data types (Numeric/Boolean) for Excel formulas
        if (originalValue.matches("^\\{[^}]+\\}$")) {
            String tag = originalValue.substring(1, originalValue.length() - 1);
            String replacement = resolveTag(tag, wd);
            setCellValueTyped(cell, replacement);
            return;
        }

        // Case 2: Mixed content (e.g. "Result: {res} mg/L")
        Matcher matcher = TAG_PATTERN.matcher(originalValue);
        StringBuilder sb = new StringBuilder();
        int lastEnd = 0;
        boolean found = false;

        while (matcher.find()) {
            found = true;
            sb.append(originalValue, lastEnd, matcher.start());
            String tag = matcher.group(1);
            sb.append(resolveTag(tag, wd));
            lastEnd = matcher.end();
        }
        
        if (found) {
            sb.append(originalValue.substring(lastEnd));
            cell.setCellValue(sb.toString());
        }
    }

    private void setCellValueTyped(Cell cell, String value) {
        if (value == null || value.isEmpty()) {
            cell.setBlank();
            return;
        }

        try {
            if (value.equalsIgnoreCase("true") || value.equalsIgnoreCase("false")) {
                cell.setCellValue(Boolean.parseBoolean(value));
            } else {
                double d = Double.parseDouble(value);
                cell.setCellValue(d);
            }
        } catch (NumberFormatException e) {
            cell.setCellValue(value);
        }
    }

    private String resolveTag(String tag, WorksheetData wd) {
        try {
            // 1. Header resolution
            if (tag.startsWith("header.")) {
                String field = tag.substring(7);
                Sample sample = wd.getSampleTest().getSample();
                switch (field) {
                    case "sampleId": return sample.getSampleNumber();
                    case "customer": return (sample.getJob() != null && sample.getJob().getClient() != null) 
                        ? sample.getJob().getClient().getName() : "";
                    case "testMethod": return wd.getSampleTest().getTestMethod().getName();
                    case "receivedAt": return sample.getReceivedAt() != null ? sample.getReceivedAt().toString() : "";
                    default: return "";
                }
            }

            // 2. Data resolution (Nested lookup)
            // Expecting: sectionId.fieldId OR sectionId.rowIndex.fieldId
            String[] parts = tag.split("\\.");
            if (parts.length < 2) return "";

            Object sectionData = wd.getData().get(parts[0]);
            if (sectionData == null) return "";

            if (parts.length == 2) {
                // {section.field}
                if (sectionData instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> map = (Map<String, Object>) sectionData;
                    return String.valueOf(map.getOrDefault(parts[1], ""));
                }
            } else if (parts.length == 3) {
                // {section.index.field}
                if (sectionData instanceof List) {
                    int index = Integer.parseInt(parts[1]);
                    List<?> list = (List<?>) sectionData;
                    if (index >= 0 && index < list.size()) {
                        Object rowData = list.get(index);
                        if (rowData instanceof Map) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> map = (Map<String, Object>) rowData;
                            return String.valueOf(map.getOrDefault(parts[2], ""));
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to resolve tag: {} - {}", tag, e.getMessage());
        }
        return "";
    }
}
