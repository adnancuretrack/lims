import { Client, type IFrame, type IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '../store/authStore';

export interface DataSyncEvent {
    entity: string;   // e.g. "SAMPLE", "SAMPLE_TEST", "JOB"
    entityId: number;
    action: string;   // e.g. "RESULT_ENTERED", "RECEIVED", "REVIEW_AUTHORIZE"
}

class SocketService {
    private client: Client | null = null;

    // Personal notification listeners (bell icon, alerts)
    private notificationListeners: Set<(notification: any) => void> = new Set();

    // Global data-sync listeners (operations refresh)
    private syncListeners: Set<(event: DataSyncEvent) => void> = new Set();

    connect() {
        if (this.client?.active) return;

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

                // Channel 1: User-specific notifications (personal alerts)
                this.client?.subscribe(`/user/${username}/queue/notifications`, (message: IMessage) => {
                    if (message.body) {
                        const notification = JSON.parse(message.body);
                        this.notificationListeners.forEach(listener => listener(notification));
                    }
                });

                // Channel 2: Global operations sync (data refresh for all clients)
                this.client?.subscribe('/topic/operations-sync', (message: IMessage) => {
                    if (message.body) {
                        const event: DataSyncEvent = JSON.parse(message.body);
                        console.log('Sync event received:', event);
                        this.syncListeners.forEach(listener => listener(event));
                    }
                });
            },
            onStompError: (frame: IFrame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            },
        });

        this.client.activate();
    }

    /** Subscribe to personal notifications (bell icon, toast messages) */
    subscribeNotifications(callback: (notification: any) => void) {
        this.notificationListeners.add(callback);
        if (!this.client?.active) {
            this.connect();
        }
        return () => { this.notificationListeners.delete(callback); };
    }

    /** Subscribe to global data-sync events (operations auto-refresh) */
    subscribeSyncEvents(callback: (event: DataSyncEvent) => void) {
        this.syncListeners.add(callback);
        if (!this.client?.active) {
            this.connect();
        }
        return () => { this.syncListeners.delete(callback); };
    }

    disconnect() {
        this.client?.deactivate();
        this.client = null;
        this.notificationListeners.clear();
        this.syncListeners.clear();
    }
}

export const socketService = new SocketService();
