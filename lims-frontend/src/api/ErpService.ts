import apiClient from './client';

export interface ErpJobImportRequest {
    externalOrderId: string;
    clientName: string;
    productName: string;
    priority: 'NORMAL' | 'URGENT' | 'EMERGENCY';
    samples: {
        externalSampleId: string;
        testMethodCodes: string[];
    }[];
}

export const ErpService = {
    importJob: async (request: ErpJobImportRequest): Promise<string> => {
        const response = await apiClient.post('/erp/import-job', request);
        return response.data;
    },

    exportJob: async (jobId: number): Promise<string> => {
        const response = await apiClient.post(`/erp/export-job/${jobId}`);
        return response.data;
    }
};
