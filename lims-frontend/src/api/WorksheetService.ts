import apiClient from './client';

export interface WorksheetSubmitRequest {
  data: Record<string, any>;
  calculatedResults: Record<string, any>;
  finalResults: Record<string, any>;
}

export const WorksheetService = {
  saveDraft: async (sampleTestId: string | number, data: Record<string, any>) => {
    return apiClient.put(`/worksheet/${sampleTestId}/draft`, data);
  },

  getWorksheet: async (sampleTestId: string | number) => {
    return apiClient.get(`/worksheet/${sampleTestId}`);
  },

  submit: async (sampleTestId: string | number, request: WorksheetSubmitRequest) => {
    return apiClient.post(`/worksheet/${sampleTestId}/submit`, request);
  },
  
  getHistory: async (sampleTestId: string | number) => {
    return apiClient.get(`/worksheet/${sampleTestId}/history`);
  },

  downloadWorksheetReport: async (sampleTestId: string | number): Promise<Blob> => {
    const response = await apiClient.get(`/worksheet/${sampleTestId}/report`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

