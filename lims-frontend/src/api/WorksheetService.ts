import apiClient from './client';

export interface WorksheetSubmitRequest {
  data: Record<string, any>;
  calculatedResults: Record<string, any>;
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
  
  submitInterim: async (sampleTestId: string | number, request: any) => {
    return apiClient.post(`/worksheet/${sampleTestId}/submit-interim`, request);
  },
  
  submitFinal: async (sampleTestId: string | number, request: any) => {
    return apiClient.post(`/worksheet/${sampleTestId}/submit-final`, request);
  },

  finalize: async (sampleTestId: string | number) => {
    return apiClient.post(`/worksheet/${sampleTestId}/finalize`);
  },

  rejectReview: async (sampleTestId: string | number) => {
    return apiClient.post(`/worksheet/${sampleTestId}/reject-review`);
  },
  
  getHistory: async (sampleTestId: string | number) => {
    return apiClient.get(`/worksheet/${sampleTestId}/history`);
  },

  reviewerEdit: async (sampleTestId: string | number, data: Record<string, any>, comment?: string) => {
    return apiClient.put(`/worksheet/${sampleTestId}/reviewer-edit`, { data, comment });
  },

  downloadWorksheetReport: async (sampleTestId: string | number): Promise<Blob> => {
    const response = await apiClient.get(`/worksheet/${sampleTestId}/report`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

