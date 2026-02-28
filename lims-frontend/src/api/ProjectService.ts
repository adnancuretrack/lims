import apiClient from './client';

export interface ProjectDTO {
    id: number;
    projectNumber: string;
    name: string;
    clientId: number;
    clientName: string;
    location?: string;
    owner?: string;
    consultant?: string;
    contractor?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    active: boolean;
}

export const ProjectService = {
    getAllProjects: async (): Promise<ProjectDTO[]> => {
        const response = await apiClient.get('/projects');
        return response.data;
    },

    getProjectsByClient: async (clientId: number): Promise<ProjectDTO[]> => {
        const response = await apiClient.get(`/projects/by-client/${clientId}`);
        return response.data;
    },

    createProject: async (project: Omit<ProjectDTO, 'id' | 'clientName'>): Promise<ProjectDTO> => {
        const response = await apiClient.post('/projects', project);
        return response.data;
    },

    updateProject: async (id: number, project: Partial<ProjectDTO>): Promise<ProjectDTO> => {
        const response = await apiClient.put(`/projects/${id}`, project);
        return response.data;
    }
};
