import apiClient from './client';

export interface UserProfileDTO {
    username: string;
    displayName: string;
    email?: string;
    phone?: string;
    roles: string[];
    hasSignature: boolean;
}

export interface UpdateProfileRequest {
    displayName?: string;
    email?: string;
    phone?: string;
    currentPassword?: string;
    newPassword?: string;
}

export const ProfileService = {
    getProfile: async (): Promise<UserProfileDTO> => {
        const response = await apiClient.get('/profile');
        return response.data;
    },

    updateProfile: async (request: UpdateProfileRequest): Promise<UserProfileDTO> => {
        const response = await apiClient.put('/profile', request);
        return response.data;
    },

    uploadSignature: async (file: File): Promise<void> => {
        const formData = new FormData();
        formData.append('file', file);
        await apiClient.post('/profile/signature', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    getSignatureImage: async (): Promise<Blob> => {
        const response = await apiClient.get('/profile/signature', {
            responseType: 'blob'
        });
        return response.data;
    }
};
