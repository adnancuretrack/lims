import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '../store/authStore';

class SocketService {
    private client: Client | null = null;
    private onNotificationCallback: ((notification: any) => void) | null = null;

    connect(onNotification: (notification: any) => void) {
        if (this.client?.connected) return;

        this.onNotificationCallback = onNotification;
        const token = useAuthStore.getState().token;
        const username = useAuthStore.getState().user?.username;

        if (!token || !username) return;

        this.client = new Client({
            webSocketFactory: () => new SockJS(`${window.location.origin}/ws`),
            connectHeaders: {
                Authorization: `Bearer ${token}`
            },
            onConnect: () => {
                console.log('Connected to WebSocket');
                // Subscribe to user-specific notification queue
                this.client?.subscribe(`/user/${username}/queue/notifications`, (message) => {
                    if (message.body) {
                        const notification = JSON.parse(message.body);
                        this.onNotificationCallback?.(notification);
                    }
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            },
        });

        this.client.activate();
    }

    disconnect() {
        this.client?.deactivate();
        this.client = null;
    }
}

export const socketService = new SocketService();
