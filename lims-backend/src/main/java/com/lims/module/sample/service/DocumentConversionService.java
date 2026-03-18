package com.lims.module.sample.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.ss.util.CellRangeAddress;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Converts uploaded attachments (PDF, Excel, Images) into PNG byte arrays
 * suitable for embedding in JasperReports.
 */
@Service
public class DocumentConversionService {

    private static final int PDF_DPI = 150;
    private static final int EXCEL_CELL_WIDTH_FACTOR = 8;  // approx pixels per character width unit
    private static final int EXCEL_ROW_HEIGHT_FACTOR = 1;  // twips to pixels factor
    private static final int EXCEL_MAX_WIDTH = 1600;       // max image width in pixels

    /**
     * Convert a file to a list of PNG images (one per page/sheet).
     */
    public List<byte[]> convertToImages(Path filePath, String fileType) throws IOException {
        if (fileType == null) {
            return List.of();
        }

        String type = fileType.toLowerCase();

        if (type.startsWith("image/")) {
            return List.of(Files.readAllBytes(filePath));
        } else if (type.equals("application/pdf")) {
            return convertPdfToImages(filePath);
        } else if (type.contains("spreadsheet") || type.contains("excel") ||
                   type.endsWith(".sheet") || filePath.toString().toLowerCase().endsWith(".xlsx") ||
                   filePath.toString().toLowerCase().endsWith(".xls")) {
            return convertExcelToImages(filePath);
        }

        // Unsupported type — skip
        return List.of();
    }

    // ==================== PDF Conversion ====================

    private List<byte[]> convertPdfToImages(Path filePath) throws IOException {
        List<byte[]> images = new ArrayList<>();
        try (PDDocument doc = Loader.loadPDF(filePath.toFile())) {
            PDFRenderer renderer = new PDFRenderer(doc);
            for (int i = 0; i < doc.getNumberOfPages(); i++) {
                BufferedImage img = renderer.renderImageWithDPI(i, PDF_DPI);
                images.add(bufferedImageToPng(img));
            }
        }
        return images;
    }

    // ==================== Excel Conversion ====================

    private List<byte[]> convertExcelToImages(Path filePath) throws IOException {
        List<byte[]> images = new ArrayList<>();
        try (Workbook wb = WorkbookFactory.create(filePath.toFile())) {
            for (int s = 0; s < wb.getNumberOfSheets(); s++) {
                Sheet sheet = wb.getSheetAt(s);
                byte[] img = renderSheetToImage(sheet);
                if (img != null) {
                    images.add(img);
                }
            }
        }
        return images;
    }

    private byte[] renderSheetToImage(Sheet sheet) throws IOException {
        int firstRow = sheet.getFirstRowNum();
        int lastRow = sheet.getLastRowNum();
        if (lastRow < firstRow) return null;

        // Determine columns range
        int maxCol = 0;
        for (int r = firstRow; r <= lastRow; r++) {
            Row row = sheet.getRow(r);
            if (row != null && row.getLastCellNum() > maxCol) {
                maxCol = row.getLastCellNum();
            }
        }
        if (maxCol == 0) return null;

        // Calculate column widths in pixels
        int[] colWidths = new int[maxCol];
        int totalWidth = 0;
        for (int c = 0; c < maxCol; c++) {
            int charWidth = sheet.getColumnWidth(c) / 256; // POI returns 1/256th of character width
            colWidths[c] = Math.max(charWidth * EXCEL_CELL_WIDTH_FACTOR, 30);
            totalWidth += colWidths[c];
        }

        // Scale down if too wide
        double scale = 1.0;
        if (totalWidth > EXCEL_MAX_WIDTH) {
            scale = (double) EXCEL_MAX_WIDTH / totalWidth;
            totalWidth = EXCEL_MAX_WIDTH;
            for (int c = 0; c < maxCol; c++) {
                colWidths[c] = (int) (colWidths[c] * scale);
            }
        }

        // Calculate row heights
        int rowCount = lastRow - firstRow + 1;
        int[] rowHeights = new int[rowCount];
        int totalHeight = 0;
        for (int r = firstRow; r <= lastRow; r++) {
            Row row = sheet.getRow(r);
            int h = 20; // default row height in pixels
            if (row != null) {
                h = (int) (row.getHeightInPoints() * 1.33); // points to pixels
            }
            rowHeights[r - firstRow] = h;
            totalHeight += h;
        }

        // Add margins
        int marginX = 10;
        int marginY = 10;
        int imgWidth = totalWidth + marginX * 2;
        int imgHeight = totalHeight + marginY * 2;

        BufferedImage image = new BufferedImage(imgWidth, imgHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

        // White background
        g.setColor(java.awt.Color.WHITE);
        g.fillRect(0, 0, imgWidth, imgHeight);

        // Draw cells
        DataFormatter formatter = new DataFormatter();
        int y = marginY;
        for (int r = firstRow; r <= lastRow; r++) {
            Row row = sheet.getRow(r);
            int x = marginX;
            int rowH = rowHeights[r - firstRow];

            for (int c = 0; c < maxCol; c++) {
                int colW = colWidths[c];

                // Check if this cell is part of a merged region (and not the top-left)
                if (!isMergedButNotFirst(sheet, r, c)) {
                    // Draw cell border
                    g.setColor(java.awt.Color.LIGHT_GRAY);
                    g.drawRect(x, y, colW, rowH);

                    // Draw cell text
                    if (row != null) {
                        Cell cell = row.getCell(c);
                        if (cell != null) {
                            String value = formatter.formatCellValue(cell);
                            g.setColor(java.awt.Color.BLACK);
                            g.setFont(new java.awt.Font("SansSerif", java.awt.Font.PLAIN, 11));
                            FontMetrics fm = g.getFontMetrics();
                            int textY = y + (rowH + fm.getAscent() - fm.getDescent()) / 2;
                            // Clip to cell bounds
                            g.setClip(x + 2, y, colW - 4, rowH);
                            g.drawString(value, x + 3, textY);
                            g.setClip(null);
                        }
                    }
                }
                x += colW;
            }
            y += rowH;
        }

        g.dispose();
        return bufferedImageToPng(image);
    }

    private boolean isMergedButNotFirst(Sheet sheet, int row, int col) {
        for (int i = 0; i < sheet.getNumMergedRegions(); i++) {
            CellRangeAddress range = sheet.getMergedRegion(i);
            if (range.isInRange(row, col)) {
                return row != range.getFirstRow() || col != range.getFirstColumn();
            }
        }
        return false;
    }

    // ==================== Utilities ====================

    private byte[] bufferedImageToPng(BufferedImage image) throws IOException {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", baos);
            return baos.toByteArray();
        }
    }
}
