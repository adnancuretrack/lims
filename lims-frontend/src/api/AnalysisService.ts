import client from './client';
import type { SampleTestDTO, ResultEntryRequest, ResultReviewRequest } from './types';

export const AnalysisService = {
    getSampleTests: async (sampleId: number): Promise<SampleTestDTO[]> => {
        const response = await client.get<SampleTestDTO[]>(`/analysis/samples/${sampleId}/tests`);
        return response.data;
    },

    enterResult: async (request: ResultEntryRequest): Promise<void> => {
        await client.post('/analysis/result', request);
    },

    reviewResult: async (request: ResultReviewRequest): Promise<void> => {
        await client.post('/review/authorize', request);
    },

    getAnalysisQueue: async (): Promise<any[]> => {
        // This will be implemented in SampleService or a dedicated view
        const response = await client.get('/samples', { params: { status: 'RECEIVED' } });
        return response.data.content;
    }
};
