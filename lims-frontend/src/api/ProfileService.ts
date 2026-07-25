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

    getSignatureUrl: (): string => {
        // Assume API base URL is set via proxy in dev, or prepend if known.
        // Easiest is to return the relative path that the client will fetch.
        // If apiClient has a baseUrl, this might need adjusting. 
        // For an <img> src, it's typically `/api/v1/profile/signature` depending on routing.
        return '/api/v1/profile/signature'; // adjust prefix based on actual LIMS API base
    }
};
