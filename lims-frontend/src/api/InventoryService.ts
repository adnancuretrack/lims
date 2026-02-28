import apiClient from './client';
import type { InventoryItemDTO, CreateInventoryItemRequest } from './types';

const BASE_URL = '/inventory';

export const InventoryService = {
    list: async (): Promise<InventoryItemDTO[]> => {
        const response = await apiClient.get(BASE_URL);
        return response.data;
    },

    listActive: async (): Promise<InventoryItemDTO[]> => {
        const response = await apiClient.get(`${BASE_URL}/active`);
        return response.data;
    },

    create: async (request: CreateInventoryItemRequest): Promise<InventoryItemDTO> => {
        const response = await apiClient.post(BASE_URL, request);
        return response.data;
    },

    update: async (id: number, request: CreateInventoryItemRequest): Promise<InventoryItemDTO> => {
        const response = await apiClient.put(`${BASE_URL}/${id}`, request);
        return response.data;
    },

    adjustStock: async (id: number, adjustment: number): Promise<InventoryItemDTO> => {
        const response = await apiClient.patch(`${BASE_URL}/${id}/adjust`, { adjustment });
        return response.data;
    },

    deactivate: async (id: number): Promise<void> => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },
};
