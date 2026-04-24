package com.lims.module.sample.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jodconverter.core.DocumentConverter;
import org.jodconverter.core.document.DefaultDocumentFormatRegistry;
import org.jodconverter.core.document.DocumentFamily;
import org.jodconverter.core.document.DocumentFormat;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Path;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class PdfConversionService {

    private final DocumentConverter converter;

    /**
     * Converts an Excel file to a PDF using Headless LibreOffice (via JODConverter).
     * This provides high-fidelity conversion preserving all Excel layouts, rotations, 
     * and print settings.
     */
    public Path convertExcelToPdf(Path excelPath) throws IOException {
        Path pdfPath = excelPath.getParent().resolve(
            excelPath.getFileName().toString().replace(".xlsx", ".pdf")
        );
        
        log.info("Converting Excel to PDF using LibreOffice: {} -> {}", excelPath, pdfPath);
        
        try {
            converter.convert(excelPath.toFile())
                     .to(pdfPath.toFile())
                     .as(DefaultDocumentFormatRegistry.PDF)
                     .execute();
            
            return pdfPath;
        } catch (Exception e) {
            log.error("LibreOffice conversion failed for: {}", excelPath, e);
            throw new IOException("Failed to convert Excel to PDF using LibreOffice: " + e.getMessage(), e);
        }
    }
}
