import apiClient from './client';
import type { AuditHistoryDTO } from './types';

export const AuditService = {
    getHistory: async (type: string, id: number): Promise<AuditHistoryDTO[]> => {
        const response = await apiClient.get(`/audit/${type}/${id}`);
        return response.data;
    }
};
