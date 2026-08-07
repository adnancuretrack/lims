package com.lims.module.sample.service;

import com.lims.module.sample.entity.Sample;
import com.lims.module.sample.entity.WorksheetData;
import com.lims.module.sample.config.ReportPrintingConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFPrintSetup;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelReportService {

    private final ReportPrintingConfig printingConfig;
    private static final Pattern TAG_PATTERN = Pattern.compile("\\{([^}]+)\\}");
    private static final Pattern TABLE_TAG_PATTERN = Pattern.compile("\\{table:([^}]+)\\}");

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

            // Use the new configuration module to select and prepare the correct sheet
            prepareWorkbook(workbook);

            Sheet sheet = workbook.getSheetAt(0); // The target sheet is now at index 0 after preparation
            // 1. Process dynamic table markers ({table:sectionId})
            processTableMarkers(sheet, worksheetData);

            // 2. Process scalar cells
            for (int r = 0; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                for (int c = 0; c < row.getLastCellNum(); c++) {
                    Cell cell = row.getCell(c);
                    if (cell != null) {
                        processCell(cell, worksheetData);
                    }
                }
            }

            // Apply 'Fit to Width' scaling if enabled in the config module
            if (printingConfig.isFitToWidth()) {
                        
                PrintSetup ps = sheet.getPrintSetup();
                sheet.setFitToPage(true);
                sheet.setAutobreaks(true);
                ps.setPaperSize(XSSFPrintSetup.A4_PAPERSIZE);
                ps.setFitWidth((short) 1);  // Force to 1 page wide
                ps.setFitHeight((short) 0); // Allow as many pages long as needed
                
            }

            // Force formula recalculation
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
                // {section.index_or_rowId.field}
                if (sectionData instanceof List) {
                    // Standard Data Table: use numeric index
                    try {
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
                    } catch (NumberFormatException e) {
                        return "";
                    }
                } else if (sectionData instanceof Map) {
                    // Matrix Table: use string rowId
                    @SuppressWarnings("unchecked")
                    Map<String, Object> matrix = (Map<String, Object>) sectionData;
                    Object rowData = matrix.get(parts[1]); 
                    if (rowData instanceof Map) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> rowMap = (Map<String, Object>) rowData;
                        return String.valueOf(rowMap.getOrDefault(parts[2], ""));
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to resolve tag: {} - {}", tag, e.getMessage());
        }
        return "";
    }

    /**
     * Prepares the workbook based on the configuration (Sheet selection and isolation).
     */
    private void prepareWorkbook(Workbook workbook) throws IOException {
        int targetIndex = printingConfig.getTargetSheetIndex();
        
        if (workbook.getNumberOfSheets() <= targetIndex) {
            throw new IOException("The template does not contain a sheet at index: " + targetIndex);
        }

        if (printingConfig.isIsolateTargetSheet()) {
            // Remove everything before the target index
            for (int i = 0; i < targetIndex; i++) {
                workbook.removeSheetAt(0);
            }
            // Remove everything that was originally after the target index
            while (workbook.getNumberOfSheets() > 1) {
                workbook.removeSheetAt(1);
            }
        }
    }

    private void processTableMarkers(Sheet sheet, WorksheetData wd) {
        if (wd.getSampleTest() == null || wd.getSampleTest().getTestMethod() == null) return;
        if (wd.getMethodDefinition() == null || wd.getMethodDefinition().getSchemaDefinition() == null) return;

        Map<String, Object> schemaDef = wd.getMethodDefinition().getSchemaDefinition();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> sections = (List<Map<String, Object>>) schemaDef.get("sections");
        if (sections == null || sections.isEmpty()) return;

        boolean markerFound = true;
        while (markerFound) {
            markerFound = false;
            for (int r = 0; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                for (int c = 0; c < row.getLastCellNum(); c++) {
                    Cell cell = row.getCell(c);
                    if (cell != null && cell.getCellType() == CellType.STRING) {
                        String text = cell.getStringCellValue();
                        if (text != null) {
                            Matcher m = TABLE_TAG_PATTERN.matcher(text);
                            if (m.find()) {
                                String sectionId = m.group(1);
                                renderTableSection(sheet, row.getRowNum(), cell.getColumnIndex(), sectionId, sections, wd);
                                markerFound = true;
                                break;
                            }
                        }
                    }
                }
                if (markerFound) break;
            }
        }
    }

    private void renderTableSection(Sheet sheet, int startRow, int startCol, String sectionId, 
                                    List<Map<String, Object>> sections, WorksheetData wd) {
        Map<String, Object> targetSection = null;
        for (Map<String, Object> sec : sections) {
            if (sectionId.equals(sec.get("id"))) {
                targetSection = sec;
                break;
            }
        }

        if (targetSection == null) return;

        String sectionType = (String) targetSection.get("type");
        Object rawData = wd.getData() != null ? wd.getData().get(sectionId) : null;

        Row templateRow = sheet.getRow(startRow);
        Cell templateCell = templateRow != null ? templateRow.getCell(startCol) : null;
        CellStyle dataStyle = templateCell != null ? templateCell.getCellStyle() : null;

        if (templateCell != null) {
            templateCell.setCellValue("");
        }

        if ("DATA_TABLE".equals(sectionType) || "GROUPED_TABLE".equals(sectionType)) {
            renderDataTable(sheet, startRow, startCol, targetSection, rawData, dataStyle);
        } else if ("MATRIX_TABLE".equals(sectionType)) {
            renderMatrixTable(sheet, startRow, startCol, targetSection, rawData, dataStyle);
        }
    }

    @SuppressWarnings("unchecked")
    private void renderDataTable(Sheet sheet, int startRow, int startCol, 
                                 Map<String, Object> section, Object rawData, CellStyle dataStyle) {
        List<Map<String, Object>> columns = (List<Map<String, Object>>) section.get("columns");
        if (columns == null || columns.isEmpty()) {
            columns = (List<Map<String, Object>>) section.get("dataColumns");
        }
        if (columns == null || columns.isEmpty()) return;

        List<Map<String, Object>> rowsData = new ArrayList<>();
        if (rawData instanceof List) {
            rowsData = (List<Map<String, Object>>) rawData;
        }

        int totalRowsToInsert = 1 + Math.max(rowsData.size(), 1);
        int lastRow = sheet.getLastRowNum();

        if (startRow < lastRow) {
            sheet.shiftRows(startRow + 1, lastRow, totalRowsToInsert - 1, true, true);
        }

        Workbook wb = sheet.getWorkbook();
        CellStyle headerStyle = wb.createCellStyle();
        if (dataStyle != null) {
            headerStyle.cloneStyleFrom(dataStyle);
        }
        Font headerFont = wb.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        // 1. Header Row
        Row headerRow = sheet.getRow(startRow);
        if (headerRow == null) headerRow = sheet.createRow(startRow);

        for (int i = 0; i < columns.size(); i++) {
            Map<String, Object> col = columns.get(i);
            Cell cell = headerRow.createCell(startCol + i);
            String label = String.valueOf(col.getOrDefault("label", ""));
            String unit = (String) col.get("unit");
            if (unit != null && !unit.trim().isEmpty()) {
                label += " (" + unit + ")";
            }
            cell.setCellValue(label);
            cell.setCellStyle(headerStyle);
        }

        // 2. Data Rows
        if (rowsData.isEmpty()) {
            Row dataRow = sheet.getRow(startRow + 1);
            if (dataRow == null) dataRow = sheet.createRow(startRow + 1);
            Cell cell = dataRow.createCell(startCol);
            cell.setCellValue("N/A");
            if (dataStyle != null) cell.setCellStyle(dataStyle);
        } else {
            for (int r = 0; r < rowsData.size(); r++) {
                Map<String, Object> rowMap = rowsData.get(r);
                int currentRowIndex = startRow + 1 + r;
                Row dataRow = sheet.getRow(currentRowIndex);
                if (dataRow == null) dataRow = sheet.createRow(currentRowIndex);

                for (int c = 0; c < columns.size(); c++) {
                    Map<String, Object> col = columns.get(c);
                    String colId = (String) col.get("id");
                    Cell cell = dataRow.createCell(startCol + c);
                    if (dataStyle != null) cell.setCellStyle(dataStyle);

                    Object valObj = rowMap.get(colId);
                    if (valObj != null) {
                        setCellValueTyped(cell, valObj.toString());
                    }
                }
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void renderMatrixTable(Sheet sheet, int startRow, int startCol, 
                                  Map<String, Object> section, Object rawData, CellStyle dataStyle) {
        List<Map<String, Object>> columns = (List<Map<String, Object>>) section.get("columns");
        List<Map<String, Object>> rowHeaders = (List<Map<String, Object>>) section.get("rowHeaders");

        if (columns == null || columns.isEmpty() || rowHeaders == null || rowHeaders.isEmpty()) return;

        Map<String, Object> matrixMap = (rawData instanceof Map) ? (Map<String, Object>) rawData : new HashMap<>();

        int totalRowsToInsert = 1 + rowHeaders.size();
        int lastRow = sheet.getLastRowNum();

        if (startRow < lastRow) {
            sheet.shiftRows(startRow + 1, lastRow, totalRowsToInsert - 1, true, true);
        }

        Workbook wb = sheet.getWorkbook();
        CellStyle headerStyle = wb.createCellStyle();
        if (dataStyle != null) {
            headerStyle.cloneStyleFrom(dataStyle);
        }
        Font headerFont = wb.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        // 1. Header Row
        Row headerRow = sheet.getRow(startRow);
        if (headerRow == null) headerRow = sheet.createRow(startRow);

        Cell cornerCell = headerRow.createCell(startCol);
        cornerCell.setCellValue("");
        cornerCell.setCellStyle(headerStyle);

        for (int c = 0; c < columns.size(); c++) {
            Map<String, Object> col = columns.get(c);
            Cell cell = headerRow.createCell(startCol + 1 + c);
            String label = String.valueOf(col.getOrDefault("label", ""));
            String unit = (String) col.get("unit");
            if (unit != null && !unit.trim().isEmpty()) {
                label += " (" + unit + ")";
            }
            cell.setCellValue(label);
            cell.setCellStyle(headerStyle);
        }

        // 2. Matrix Data Rows
        for (int r = 0; r < rowHeaders.size(); r++) {
            Map<String, Object> rh = rowHeaders.get(r);
            String rhId = (String) rh.get("id");
            String rhLabel = String.valueOf(rh.getOrDefault("label", rhId));

            int currentRowIndex = startRow + 1 + r;
            Row dataRow = sheet.getRow(currentRowIndex);
            if (dataRow == null) dataRow = sheet.createRow(currentRowIndex);

            Cell labelCell = dataRow.createCell(startCol);
            labelCell.setCellValue(rhLabel);
            labelCell.setCellStyle(headerStyle);

            Map<String, Object> rowVals = (matrixMap.get(rhId) instanceof Map) ? (Map<String, Object>) matrixMap.get(rhId) : new HashMap<>();

            for (int c = 0; c < columns.size(); c++) {
                Map<String, Object> col = columns.get(c);
                String colId = (String) col.get("id");
                Cell cell = dataRow.createCell(startCol + 1 + c);
                if (dataStyle != null) cell.setCellStyle(dataStyle);

                Object valObj = rowVals.get(colId);
                if (valObj != null) {
                    setCellValueTyped(cell, valObj.toString());
                }
            }
        }
    }
}
