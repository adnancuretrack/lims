package com.lims.module.erp.dto;

import lombok.Data;
import java.util.List;

@Data
public class ErpJobImportRequest {
    private String externalOrderId;
    private String clientName; // We can lookup by name or ID, name is more common for ERP
    private String productName;
    private String priority; // NORMAL, URGENT, EMERGENCY
    private List<ErpSampleImport> samples;

    @Data
    public static class ErpSampleImport {
        private String externalSampleId;
        private List<String> testMethodCodes;
    }
}
