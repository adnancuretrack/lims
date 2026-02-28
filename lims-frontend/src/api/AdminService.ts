import apiClient from './client';

export interface UserDTO {
    id: number;
    username: string;
    displayName: string;
    email?: string;
    active: boolean;
    roles: string[];
    lastLoginAt?: string;
}

export interface CreateUserRequest {
    username: string;
    password?: string;
    displayName: string;
    email?: string;
    roles?: string[];
}

export const AdminService = {
    listUsers: async (): Promise<UserDTO[]> => {
        const response = await apiClient.get('/admin/users');
        return response.data;
    },

    createUser: async (user: CreateUserRequest): Promise<UserDTO> => {
        const response = await apiClient.post('/admin/users', user);
        return response.data;
    },

    updateUser: async (id: number, user: Partial<UserDTO>): Promise<UserDTO> => {
        const response = await apiClient.put(`/admin/users/${id}`, user);
        return response.data;
    },

    listRoles: async (): Promise<string[]> => {
        const response = await apiClient.get('/admin/roles');
        return response.data;
    }
};
