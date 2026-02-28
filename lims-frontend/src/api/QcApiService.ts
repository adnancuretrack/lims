import apiClient from './client';

export interface QcDataPointDTO {
    id: number;
    measuredValue: number;
    measuredAt: string;
    measuredByName: string;
    lotId?: number;
    violation: boolean;
    violationRule?: string;
    notes?: string;
}

export interface QcChartStatsDTO {
    chartId: number;
    chartName: string;
    totalPoints: number;
    violationCount: number;
    mean: number;
    standardDeviation: number;
    cpk: number;
    inControl: boolean;
}

export interface QcChartDTO {
    id: number;
    name: string;
    testMethodId: number;
    testMethodName: string;
    instrumentId?: number;
    chartType: string;
    targetValue?: number;
    ucl?: number;
    lcl?: number;
    usl?: number;
    lsl?: number;
    active: boolean;
    createdAt: string;
    dataPoints?: QcDataPointDTO[];
}

export interface CreateQcChartRequest {
    name: string;
    testMethodId: number;
    instrumentId?: number;
    chartType?: string;
    targetValue?: number;
    ucl?: number;
    lcl?: number;
    usl?: number;
    lsl?: number;
}

export interface AddDataPointRequest {
    measuredValue: number;
    lotId?: number;
    notes?: string;
}

export const QcApiService = {
    // Chart CRUD
    listCharts: async (): Promise<QcChartDTO[]> => {
        const response = await apiClient.get('/qc/charts');
        return response.data;
    },

    createChart: async (request: CreateQcChartRequest): Promise<QcChartDTO> => {
        const response = await apiClient.post('/qc/charts', request);
        return response.data;
    },

    getChartWithData: async (id: number): Promise<QcChartDTO> => {
        const response = await apiClient.get(`/qc/charts/${id}`);
        return response.data;
    },

    // Data Points
    addDataPoint: async (chartId: number, request: AddDataPointRequest): Promise<QcDataPointDTO> => {
        const response = await apiClient.post(`/qc/charts/${chartId}/data`, request);
        return response.data;
    },

    // Statistics
    getChartStats: async (chartId: number): Promise<QcChartStatsDTO> => {
        const response = await apiClient.get(`/qc/charts/${chartId}/stats`);
        return response.data;
    },

    // Dashboard
    countRecentViolations: async (days: number = 7): Promise<number> => {
        const response = await apiClient.get('/qc/violations/count', { params: { days } });
        return response.data;
    }
};
