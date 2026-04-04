package com.lims.module.sample.service;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;

import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
@Slf4j
public class PdfConversionService {

    /**
     * Converts an Excel file to a PDF by rendering its content as HTML first.
     * Use this for lightweight, pure-Java COA generation.
     */
    public Path convertExcelToPdf(Path excelPath) throws IOException {
        String html = convertExcelToHtml(excelPath);
        
        Path pdfPath = excelPath.getParent().resolve(excelPath.getFileName().toString().replace(".xlsx", ".pdf"));
        
        try (OutputStream os = new FileOutputStream(pdfPath.toFile())) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(html, excelPath.toUri().toString());
            builder.toStream(os);
            builder.run();
        }
        
        return pdfPath;
    }

    private String convertExcelToHtml(Path excelPath) throws IOException {
        StringBuilder sb = new StringBuilder();
        sb.append("<html><head><style>");
        sb.append("body { font-family: 'Arial', sans-serif; margin: 20px; }");
        sb.append("table { border-collapse: collapse; width: 100%; table-layout: fixed; }");
        sb.append("td { border: 1px solid #ccc; padding: 4px; font-size: 11px; overflow: hidden; word-wrap: break-word; }");
        sb.append(".header { background-color: #f2f2f2; font-weight: bold; }");
        sb.append("</style></head><body>");

        try (Workbook workbook = WorkbookFactory.create(excelPath.toFile())) {
            Sheet sheet = workbook.getSheetAt(0); // For COA, usually 1st sheet is the report
            sb.append("<table>");
            
            for (Row row : sheet) {
                // Set approximate row height if possible
                sb.append("<tr style='height: ").append(row.getHeightInPoints()).append("pt;'>");
                for (int cn = 0; cn < row.getLastCellNum(); cn++) {
                    Cell cell = row.getCell(cn, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK);
                    
                    // Simple style inference
                    String style = getCellStyle(cell);
                    int colspan = getColSpan(sheet, row.getRowNum(), cn);
                    int rowspan = getRowSpan(sheet, row.getRowNum(), cn);
                    
                    if (isMergedRegionPart(sheet, row.getRowNum(), cn) && colspan == 1 && rowspan == 1) {
                        continue; // Skip cells that are parts of merged regions (except the main one)
                    }

                    sb.append("<td ");
                    if (colspan > 1) sb.append("colspan='").append(colspan).append("' ");
                    if (rowspan > 1) sb.append("rowspan='").append(rowspan).append("' ");
                    sb.append("style='").append(style).append("'>");
                    
                    sb.append(getCellValueAsString(cell));
                    sb.append("</td>");
                }
                sb.append("</tr>");
            }
            sb.append("</table>");
        }
        
        sb.append("</body></html>");
        return sb.toString();
    }

    private String getCellValueAsString(Cell cell) {
        switch (cell.getCellType()) {
            case STRING: return cell.getStringCellValue();
            case NUMERIC: 
                if (DateUtil.isCellDateFormatted(cell)) return cell.getDateCellValue().toString();
                return String.valueOf(cell.getNumericCellValue());
            case BOOLEAN: return String.valueOf(cell.getBooleanCellValue());
            case FORMULA: 
                try {
                    return String.valueOf(cell.getNumericCellValue());
                } catch (Exception e) {
                    return cell.getCellFormula();
                }
            default: return "";
        }
    }

    private String getCellStyle(Cell cell) {
        CellStyle cs = cell.getCellStyle();
        StringBuilder style = new StringBuilder();
        
        // Alignment
        if (cs.getAlignment() == HorizontalAlignment.CENTER) style.append("text-align: center; ");
        if (cs.getAlignment() == HorizontalAlignment.RIGHT) style.append("text-align: right; ");
        
        // Font Weight
        Font font = cell.getSheet().getWorkbook().getFontAt(cs.getFontIndex());
        if (font.getBold()) style.append("font-weight: bold; ");
        
        // Background color (very basic)
        if (cs.getFillForegroundColor() != IndexedColors.AUTOMATIC.getIndex()) {
            // Mapping IndexedColors to CSS is complex, using a fallback
        }
        
        return style.toString();
    }

    private int getColSpan(Sheet sheet, int row, int col) {
        for (int i = 0; i < sheet.getNumMergedRegions(); i++) {
            var region = sheet.getMergedRegion(i);
            if (region.isInRange(row, col)) {
                return region.getLastColumn() - region.getFirstColumn() + 1;
            }
        }
        return 1;
    }

    private int getRowSpan(Sheet sheet, int row, int col) {
        for (int i = 0; i < sheet.getNumMergedRegions(); i++) {
            var region = sheet.getMergedRegion(i);
            if (region.isInRange(row, col)) {
                return region.getLastRow() - region.getFirstRow() + 1;
            }
        }
        return 1;
    }

    private boolean isMergedRegionPart(Sheet sheet, int row, int col) {
        for (int i = 0; i < sheet.getNumMergedRegions(); i++) {
            var region = sheet.getMergedRegion(i);
            if (region.isInRange(row, col)) {
                return row != region.getFirstRow() || col != region.getFirstColumn();
            }
        }
        return false;
    }
}
