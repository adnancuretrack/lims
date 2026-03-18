import apiClient from './client';
import type { SampleRegistrationRequest, JobDTO, SampleDTO, ClientDTO, ProductDTO, DashboardStats } from './types';

const BASE_URL = '';

export const SampleService = {
    register: async (request: SampleRegistrationRequest): Promise<JobDTO> => {
        const response = await apiClient.post(`${BASE_URL}/samples/register`, request);
        return response.data;
    },

    list: async (page = 0, size = 10, search?: string): Promise<{ content: SampleDTO[], totalElements: number }> => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('size', size.toString());
        if (search) params.append('search', search);
        const response = await apiClient.get(`${BASE_URL}/samples?${params.toString()}`);
        return response.data;
    },

    getActiveClients: async (): Promise<ClientDTO[]> => {
        const response = await apiClient.get(`${BASE_URL}/lookup/clients`);
        return response.data;
    },

    getActiveProducts: async (): Promise<ProductDTO[]> => {
        const response = await apiClient.get(`${BASE_URL}/lookup/products`);
        return response.data;
    },

    receiveSample: async (id: number, request: { condition: string }): Promise<SampleDTO> => {
        const response = await apiClient.patch(`${BASE_URL}/samples/${id}/receive`, request);
        return response.data;
    },

    rejectSample: async (id: number, request: { reason: string }): Promise<SampleDTO> => {
        const response = await apiClient.patch(`${BASE_URL}/samples/${id}/reject`, request);
        return response.data;
    },

    getStats: async (): Promise<DashboardStats> => {
        const response = await apiClient.get(`${BASE_URL}/samples/stats`);
        return response.data;
    },

    getById: async (id: number): Promise<SampleDTO> => {
        const response = await apiClient.get(`${BASE_URL}/samples/${id}`);
        return response.data;
    },

    getTests: async (id: number): Promise<any[]> => {
        const response = await apiClient.get(`${BASE_URL}/samples/${id}/tests`);
        return response.data;
    },

    listAll: async (): Promise<SampleDTO[]> => {
        const response = await apiClient.get(`${BASE_URL}/samples`, { params: { size: 1000 } });
        return response.data.content;
    },

    downloadCoa: async (id: number): Promise<Blob> => {
        const response = await apiClient.get(`${BASE_URL}/reports/coa/${id}`, {
            responseType: 'blob'
        });
        return response.data;
    }
};
