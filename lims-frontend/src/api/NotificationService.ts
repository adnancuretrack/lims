import apiClient from './client';
import type { NotificationDTO } from './types';

export const NotificationService = {
    list: async (): Promise<NotificationDTO[]> => {
        const response = await apiClient.get('/notifications');
        return response.data;
    },

    getUnreadCount: async (): Promise<number> => {
        const response = await apiClient.get('/notifications/unread-count');
        return response.data;
    },

    markAsRead: async (id: number): Promise<void> => {
        await apiClient.put(`/notifications/${id}/read`);
    }
};
