package com.lims.module.sample.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.stereotype.Component;

/**
 * Centralized configuration for report printing and PDF generation.
 * This allows administrators to adjust which sheets are printed without
 * modifying the core business logic.
 */
@Component
@Getter
@Setter
public class ReportPrintingConfig {

    /**
     * The index of the sheet to be used for the COA/Worksheet PDF.
     * 0 = First Sheet
     * 1 = Second Sheet (Current requirement)
     */
    private int targetSheetIndex = 1;

    /**
     * Whether to force the report to fit the width of a single page.
     * If true, wide reports will be scaled down to fit A4 Portrait/Landscape.
     */
    private boolean fitToWidth = true;

    /**
     * Whether to remove all other sheets before conversion.
     * Set to true to ensure high-fidelity single-sheet PDFs.
     */
    private boolean isolateTargetSheet = true;
}
