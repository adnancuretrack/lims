import apiClient from './client';
import type { MethodDefinitionDTO } from './types';

export const MethodDefinitionService = {
    getHistory: async (testMethodId: number | string): Promise<MethodDefinitionDTO[]> => {
        const response = await apiClient.get(`/v1/test-methods/${testMethodId}/definitions`);
        return response.data;
    },

    getActiveDefinition: async (testMethodId: number | string): Promise<MethodDefinitionDTO> => {
        const response = await apiClient.get(`/v1/test-methods/${testMethodId}/definitions/active`);
        return response.data;
    },

    saveDraft: async (testMethodId: number | string, definition: Partial<MethodDefinitionDTO>): Promise<MethodDefinitionDTO> => {
        const response = await apiClient.post(`/v1/test-methods/${testMethodId}/definitions/draft`, definition);
        return response.data;
    },

    publish: async (testMethodId: number | string, userId: number): Promise<MethodDefinitionDTO> => {
        const response = await apiClient.post(`/v1/test-methods/${testMethodId}/definitions/publish?userId=${userId}`);
        return response.data;
    }
};
