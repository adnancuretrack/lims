import apiClient from './client';

export interface TatReportDTO {
    status: string;
    count: number;
    averageTatHours: number;
    minTatHours: number;
    maxTatHours: number;
}

export interface WorkloadReportDTO {
    analystName: string;
    samplesAssigned: number;
    testsCompleted: number;
    testsPending: number;
}

export interface OverdueSampleDTO {
    sampleId: number;
    sampleNumber: string;
    clientName: string;
    productName: string;
    status: string;
    dueDate: string;
    daysOverdue: number;
    assignedTo: string;
}

export const ReportApiService = {
    getTatReport: async (): Promise<TatReportDTO[]> => {
        const response = await apiClient.get('/reports/tat');
        return response.data;
    },

    getWorkloadReport: async (): Promise<WorkloadReportDTO[]> => {
        const response = await apiClient.get('/reports/workload');
        return response.data;
    },

    getOverdueReport: async (): Promise<OverdueSampleDTO[]> => {
        const response = await apiClient.get('/reports/overdue');
        return response.data;
    },

    downloadCoa: async (sampleId: number): Promise<Blob> => {
        const response = await apiClient.get(`/reports/coa/${sampleId}`, {
            responseType: 'blob',
        });
        return response.data;
    },
};
