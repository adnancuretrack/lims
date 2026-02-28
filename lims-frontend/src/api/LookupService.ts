import apiClient from './client';
import type { ClientDTO, ProductDTO, TestMethodDTO, ProductTestDTO } from './types';

const BASE_URL = '/lookup';

export const LookupService = {
    // Admin list view for Clients
    getAllClients: async (): Promise<ClientDTO[]> => {
        const response = await apiClient.get(`${BASE_URL}/clients`);
        return response.data;
    },

    createClient: async (client: Omit<ClientDTO, 'id' | 'active'>): Promise<ClientDTO> => {
        const response = await apiClient.post(`${BASE_URL}/clients`, client);
        return response.data;
    },

    updateClient: async (id: number, client: Partial<ClientDTO>): Promise<ClientDTO> => {
        const response = await apiClient.put(`${BASE_URL}/clients/${id}`, client);
        return response.data;
    },

    // Product CRUD
    getAllProducts: async (): Promise<ProductDTO[]> => {
        const response = await apiClient.get(`${BASE_URL}/products`);
        return response.data;
    },

    createProduct: async (product: Omit<ProductDTO, 'id' | 'active'>): Promise<ProductDTO> => {
        const response = await apiClient.post(`${BASE_URL}/products`, product);
        return response.data;
    },

    updateProduct: async (id: number, product: Partial<ProductDTO>): Promise<ProductDTO> => {
        const response = await apiClient.put(`${BASE_URL}/products/${id}`, product);
        return response.data;
    },

    // Product-Test assignment
    getProductTests: async (productId: number): Promise<ProductTestDTO[]> => {
        const response = await apiClient.get(`${BASE_URL}/products/${productId}/tests`);
        return response.data;
    },

    assignProductTests: async (productId: number, testMethodIds: number[]): Promise<void> => {
        await apiClient.post(`${BASE_URL}/products/${productId}/tests`, testMethodIds);
    },

    // Test Method CRUD
    getAllTestMethods: async (): Promise<TestMethodDTO[]> => {
        const response = await apiClient.get(`${BASE_URL}/test-methods`);
        return response.data;
    },

    createTestMethod: async (testMethod: Omit<TestMethodDTO, 'id' | 'active'>): Promise<TestMethodDTO> => {
        const response = await apiClient.post(`${BASE_URL}/test-methods`, testMethod);
        return response.data;
    },

    updateTestMethod: async (id: number, testMethod: Partial<TestMethodDTO>): Promise<TestMethodDTO> => {
        const response = await apiClient.put(`${BASE_URL}/test-methods/${id}`, testMethod);
        return response.data;
    }
};
