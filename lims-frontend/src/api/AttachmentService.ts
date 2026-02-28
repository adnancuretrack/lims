import apiClient from './client';
import type { AttachmentDTO } from './types';

export const AttachmentService = {
    listForSample: async (sampleId: number): Promise<AttachmentDTO[]> => {
        const response = await apiClient.get(`/attachments/sample/${sampleId}`);
        return response.data;
    },

    uploadForSample: async (sampleId: number, file: File): Promise<AttachmentDTO> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post(`/attachments/sample/${sampleId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    downloadLink: (id: number) => {
        return `${apiClient.defaults.baseURL}/attachments/${id}/download`;
    }
};
