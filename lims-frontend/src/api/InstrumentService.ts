import apiClient from './client';
import type { InstrumentDTO, CreateInstrumentRequest } from './types';

const BASE_URL = '/instruments';

export const InstrumentService = {
    list: async (): Promise<InstrumentDTO[]> => {
        const response = await apiClient.get(BASE_URL);
        return response.data;
    },

    listActive: async (): Promise<InstrumentDTO[]> => {
        const response = await apiClient.get(`${BASE_URL}/active`);
        return response.data;
    },

    create: async (request: CreateInstrumentRequest): Promise<InstrumentDTO> => {
        const response = await apiClient.post(BASE_URL, request);
        return response.data;
    },

    update: async (id: number, request: CreateInstrumentRequest): Promise<InstrumentDTO> => {
        const response = await apiClient.put(`${BASE_URL}/${id}`, request);
        return response.data;
    },

    calibrate: async (id: number, nextCalibrationDate: string, calibratedBy: string): Promise<InstrumentDTO> => {
        const response = await apiClient.patch(`${BASE_URL}/${id}/calibrate`, { nextCalibrationDate, calibratedBy });
        return response.data;
    },

    deactivate: async (id: number): Promise<void> => {
        await apiClient.delete(`${BASE_URL}/${id}`);
    },
};
