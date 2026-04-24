import apiClient from './client';
import type { ComplianceDocumentDTO } from './types';

export const ComplianceDocumentService = {
    list: async (): Promise<ComplianceDocumentDTO[]> => {
        const response = await apiClient.get('/documents');
        return response.data;
    },

    upload: async (file: File, description?: string, category?: string): Promise<ComplianceDocumentDTO> => {
        const formData = new FormData();
        formData.append('file', file);
        if (description) formData.append('description', description);
        if (category) formData.append('category', category);

        const response = await apiClient.post('/documents/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    downloadLink: (id: number) => {
        return `${apiClient.defaults.baseURL}/documents/${id}/download`;
    },

    download: async (id: number): Promise<Blob> => {
        const response = await apiClient.get(`/documents/${id}/download`, {
            responseType: 'blob'
        });
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/documents/${id}`);
    }
};
