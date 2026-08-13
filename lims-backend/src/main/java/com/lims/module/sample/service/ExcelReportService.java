package com.lims.module.sample.service;

import com.lims.module.sample.entity.Sample;
import com.lims.module.sample.entity.WorksheetData;
import com.lims.module.sample.config.ReportPrintingConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFPrintSetup;
import org.apache.poi.ss.util.CellRangeAddress;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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
    private final ComputedVariableEvaluator computedVariableEvaluator;
    private final QrCodeService qrCodeService;

    @Value("${lims.app-url:http://localhost:5173}")
    private String appUrl;

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

            // Phase 1: Prepare workbook
            prepareWorkbook(workbook);

            Sheet sheet = workbook.getSheetAt(0); // The target sheet is now at index 0 after preparation
            
            // Phase 2: Process legacy dynamic table markers ({table:sectionId})
            processTableMarkers(sheet, worksheetData);

            // Phase 3 & 4: Build Variable Resolution Map (Scalars, Indexed, Matrix, Count, Computed)
            Map<String, String> resolutionMap = buildResolutionMap(worksheetData);

            // Phase 5: Process scalar cells and substitutions
            for (int r = 0; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                for (int c = 0; c < row.getLastCellNum(); c++) {
                    Cell cell = row.getCell(c);
                    if (cell != null) {
                        if (cell.getCellType() == CellType.STRING) {
                            String val = cell.getStringCellValue();
                            if (val != null && (val.trim().equalsIgnoreCase("{qr}") || val.trim().equalsIgnoreCase("{qr:coa}"))) {
                                embedQrCode(sheet, workbook, cell, worksheetData);
                                continue;
                            }
                        }
                        processCellWithMap(cell, resolutionMap);
                    }
                }
            }

            // Phase 6: Apply 'Fit to Width' scaling and recalculate
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

    private Map<String, String> buildResolutionMap(WorksheetData wd) {
        Map<String, String> map = new HashMap<>();
        
        // 1. Header Resolution
        Sample sample = wd.getSampleTest().getSample();
        map.put("header.sampleId", sample.getSampleNumber());
        if (sample.getJob() != null && sample.getJob().getClient() != null) {
            map.put("header.customer", sample.getJob().getClient().getName());
        } else {
            map.put("header.customer", "");
        }
        map.put("header.testMethod", wd.getSampleTest().getTestMethod().getName());
        map.put("header.receivedAt", sample.getReceivedAt() != null ? sample.getReceivedAt().toString() : "");

        // 2. Data Resolution (Scalars, Indexed Tables, Matrix)
        Map<String, Object> data = wd.getData();
        if (data != null) {
            for (Map.Entry<String, Object> sectionEntry : data.entrySet()) {
                String sectionId = sectionEntry.getKey();
                Object sectionData = sectionEntry.getValue();

                if (sectionData instanceof Map) {
                    // Scalar section OR Matrix section
                    @SuppressWarnings("unchecked")
                    Map<String, Object> mapData = (Map<String, Object>) sectionData;
                    for (Map.Entry<String, Object> fieldEntry : mapData.entrySet()) {
                        String key = fieldEntry.getKey();
                        Object val = fieldEntry.getValue();
                        
                        if (val instanceof Map) {
                            // Matrix row: mapData is rows, val is columns
                            @SuppressWarnings("unchecked")
                            Map<String, Object> rowMap = (Map<String, Object>) val;
                            for (Map.Entry<String, Object> cellEntry : rowMap.entrySet()) {
                                // {section.rowKey.colKey}
                                map.put(sectionId + "." + key + "." + cellEntry.getKey(), String.valueOf(cellEntry.getValue()));
                            }
                        } else {
                            // Scalar field {section.field}
                            map.put(sectionId + "." + key, String.valueOf(val));
                        }
                    }
                    map.put("count:" + sectionId, String.valueOf(mapData.size()));
                } else if (sectionData instanceof List) {
                    // Data Table (List of rows)
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> listData = (List<Map<String, Object>>) sectionData;
                    map.put("count:" + sectionId, String.valueOf(listData.size()));
                    
                    for (int i = 0; i < listData.size(); i++) {
                        Map<String, Object> rowMap = listData.get(i);
                        if (rowMap != null) {
                            for (Map.Entry<String, Object> entry : rowMap.entrySet()) {
                                // {section.field.N} -> user requested format!
                                map.put(sectionId + "." + entry.getKey() + "." + i, String.valueOf(entry.getValue()));
                            }
                        }
                    }
                }
            }
        }
        
        // Phase 4: Evaluate Computed Variables
        if (wd.getMethodDefinition() != null) {
            Map<String, Object> schemaDef = wd.getMethodDefinition().getSchemaDefinition();
            if (schemaDef != null && schemaDef.containsKey("computedVariables")) {
                Object cvObj = schemaDef.get("computedVariables");
                if (cvObj instanceof List) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> computedVars = (List<Map<String, Object>>) cvObj;
                    for (Map<String, Object> cv : computedVars) {
                        String id = (String) cv.get("id");
                        String expression = (String) cv.get("expression");
                        String format = (String) cv.get("format");
                        
                        if (id != null && expression != null && computedVariableEvaluator != null) {
                            String result = computedVariableEvaluator.evaluate(expression, format, map);
                            map.put("calc:" + id, result);
                        }
                    }
                }
            }
        }
        return map;
    }

    private void processCellWithMap(Cell cell, Map<String, String> resolutionMap) {
        if (cell.getCellType() != CellType.STRING) return;

        String originalValue = cell.getStringCellValue();
        if (originalValue == null || !originalValue.contains("{")) return;

        // Case 1: Entire cell is a single tag (e.g. "{results.value.0}")
        // We do this to preserve data types (Numeric/Boolean) for Excel formulas
        if (originalValue.matches("^\\{[^}]+\\}$")) {
            String tag = originalValue.substring(1, originalValue.length() - 1);
            String replacement = resolutionMap.getOrDefault(tag, "");
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
            sb.append(resolutionMap.getOrDefault(tag, ""));
            lastEnd = matcher.end();
        }
        
        if (found) {
            sb.append(originalValue.substring(lastEnd));
            String finalString = sb.toString();
            
            Matcher sigMatcher = Pattern.compile("([^\\s]*uploads[/\\\\]signatures[/\\\\][^\\s]*\\.(png|jpg|jpeg))", Pattern.CASE_INSENSITIVE).matcher(finalString);
            if (sigMatcher.find()) {
                String pathStr = sigMatcher.group(1);
                String normalizedPath = pathStr.replace("\\", "/");
                Path imgPath = Paths.get(normalizedPath).toAbsolutePath();
                if (Files.exists(imgPath)) {
                    embedImage(cell.getSheet(), cell.getSheet().getWorkbook(), cell, imgPath);
                    String remainingText = finalString.replace(pathStr, "").trim();
                    if (!remainingText.isEmpty()) {
                        cell.setCellValue(remainingText);
                    }
                    return;
                } else {
                    log.warn("Signature image path mapped (mixed) but file not found on disk: {}", imgPath);
                }
            }
            
            cell.setCellValue(finalString);
        }
    }

    private void setCellValueTyped(Cell cell, String value) {
        if (value == null || value.isEmpty()) {
            cell.setBlank();
            return;
        }

        try {
            if (value.toLowerCase().matches(".*uploads[/\\\\]signatures[/\\\\].*\\.(png|jpg|jpeg)")) {
                // Normalize path for Linux/Windows differences
                String normalizedPath = value.replace("\\", "/");
                Path imgPath = Paths.get(normalizedPath).toAbsolutePath();
                if (Files.exists(imgPath)) {
                    embedImage(cell.getSheet(), cell.getSheet().getWorkbook(), cell, imgPath);
                    return;
                } else {
                    log.warn("Signature image path mapped but file not found on disk: {}", imgPath);
                }
            }

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

    private void embedQrCode(Sheet sheet, Workbook workbook, Cell cell, WorksheetData worksheetData) {
        Long sampleId = null;
        if (worksheetData.getSampleTest() != null && worksheetData.getSampleTest().getSample() != null) {
            sampleId = worksheetData.getSampleTest().getSample().getId();
        }

        String targetUrl;
        String baseUrl = (appUrl != null && !appUrl.isBlank()) ? appUrl.replaceAll("/$", "") : "http://localhost:5173";
        if (sampleId != null) {
            targetUrl = baseUrl + "/verify/coa/" + sampleId;
        } else {
            targetUrl = baseUrl;
        }

        try {
            byte[] qrBytes = qrCodeService.generateQrCodePng(targetUrl);
            int pictureIdx = workbook.addPicture(qrBytes, Workbook.PICTURE_TYPE_PNG);

            int startCol = cell.getColumnIndex();
            int startRow = cell.getRowIndex();
            int endCol = startCol + 1;
            int endRow = startRow + 1;

            // Check if cell is in a merged region to cover the full merged area
            for (int i = 0; i < sheet.getNumMergedRegions(); i++) {
                CellRangeAddress range = sheet.getMergedRegion(i);
                if (range.isInRange(startRow, startCol)) {
                    startCol = range.getFirstColumn();
                    startRow = range.getFirstRow();
                    endCol = range.getLastColumn() + 1;
                    endRow = range.getLastRow() + 1;
                    break;
                }
            }

            Drawing<?> drawing = sheet.createDrawingPatriarch();
            CreationHelper helper = workbook.getCreationHelper();
            ClientAnchor anchor = helper.createClientAnchor();
            anchor.setCol1(startCol);
            anchor.setRow1(startRow);
            anchor.setCol2(endCol);
            anchor.setRow2(endRow);
            anchor.setAnchorType(ClientAnchor.AnchorType.MOVE_AND_RESIZE);

            drawing.createPicture(anchor, pictureIdx);
            cell.setBlank();
        } catch (Exception e) {
            log.error("Failed to embed QR code in Excel report", e);
            cell.setCellValue("");
        }
    }
    private void embedImage(Sheet sheet, Workbook workbook, Cell cell, Path imagePath) {
        try {
            byte[] imgBytes = Files.readAllBytes(imagePath);
            int pictureType = Workbook.PICTURE_TYPE_PNG;
            String filename = imagePath.getFileName().toString().toLowerCase();
            if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
                pictureType = Workbook.PICTURE_TYPE_JPEG;
            }
            int pictureIdx = workbook.addPicture(imgBytes, pictureType);

            int startCol = cell.getColumnIndex();
            int startRow = cell.getRowIndex();
            int endCol = startCol + 1;
            int endRow = startRow + 1;

            // Check if cell is in a merged region to cover the full merged area
            for (int i = 0; i < sheet.getNumMergedRegions(); i++) {
                CellRangeAddress range = sheet.getMergedRegion(i);
                if (range.isInRange(startRow, startCol)) {
                    startCol = range.getFirstColumn();
                    startRow = range.getFirstRow();
                    endCol = range.getLastColumn() + 1;
                    endRow = range.getLastRow() + 1;
                    break;
                }
            }

            Drawing<?> drawing = sheet.createDrawingPatriarch();
            CreationHelper helper = workbook.getCreationHelper();
            ClientAnchor anchor = helper.createClientAnchor();
            anchor.setCol1(startCol);
            anchor.setRow1(startRow);
            anchor.setCol2(endCol);
            anchor.setRow2(endRow);
            anchor.setAnchorType(ClientAnchor.AnchorType.MOVE_AND_RESIZE);

            drawing.createPicture(anchor, pictureIdx);
            cell.setBlank();
        } catch (Exception e) {
            log.error("Failed to embed image from path: {}", imagePath, e);
            cell.setCellValue(imagePath.toString());
        }
    }
}
