import apiClient from './client';

export interface InvestigationDTO {
    id: number;
    ncrNumber: string;
    title: string;
    type: 'NCR' | 'CAPA' | 'COMPLAINT' | 'DEVIATION';
    severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
    status: 'OPEN' | 'INVESTIGATING' | 'CORRECTIVE_ACTION' | 'CLOSED';
    description: string;
    rootCause?: string;
    correctiveAction?: string;
    preventiveAction?: string;
    relatedSampleId?: number;
    relatedSampleNumber?: string;
    assignedToId?: number;
    assignedToName?: string;
    openedById: number;
    openedByName: string;
    openedAt: string;
    closedById?: number;
    closedByName?: string;
    closedAt?: string;
    dueDate?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateInvestigationRequest {
    title: string;
    type: string;
    severity: string;
    description: string;
    relatedSampleId?: number;
    assignedToId?: number;
    dueDate?: string;
}

export interface UpdateInvestigationRequest {
    status?: string;
    rootCause?: string;
    correctiveAction?: string;
    preventiveAction?: string;
    assignedToId?: number;
    dueDate?: string;
}

export const InvestigationService = {
    getAllInvestigations: async (): Promise<InvestigationDTO[]> => {
        const response = await apiClient.get('/investigations');
        return response.data;
    },

    getMyInvestigations: async (): Promise<InvestigationDTO[]> => {
        const response = await apiClient.get('/investigations/my');
        return response.data;
    },

    getInvestigation: async (id: number): Promise<InvestigationDTO> => {
        const response = await apiClient.get(`/investigations/${id}`);
        return response.data;
    },

    createInvestigation: async (request: CreateInvestigationRequest): Promise<InvestigationDTO> => {
        const response = await apiClient.post('/investigations', request);
        return response.data;
    },

    updateInvestigation: async (id: number, request: UpdateInvestigationRequest): Promise<InvestigationDTO> => {
        const response = await apiClient.put(`/investigations/${id}`, request);
        return response.data;
    },

    getOpenCount: async (): Promise<number> => {
        const response = await apiClient.get('/investigations/stats/open');
        return response.data;
    }
};
