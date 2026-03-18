import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketService } from '../api/SocketService';
import type { DataSyncEvent } from '../api/SocketService';

/**
 * GlobalSyncProvider listens to the /topic/operations-sync WebSocket channel
 * and invalidates relevant React Query caches when data changes in the backend.
 * 
 * This ensures that all "operations" pages (Sample List, Sample Detail, etc.)
 * update immediately when any user makes a change, without manually refreshing.
 */
export function GlobalSyncProvider() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const unsubscribe = socketService.subscribeSyncEvents((event: DataSyncEvent) => {
            console.log(`[GlobalSync] Received: ${event.action} on ${event.entity} (ID: ${event.entityId})`);

            if (event.entity === 'SAMPLE') {
                // Invalidate all sample-related queries
                queryClient.invalidateQueries({ queryKey: ['samples'] });       // Sample list pages
                queryClient.invalidateQueries({ queryKey: ['sample', String(event.entityId)] }); // Specific detail page
                queryClient.invalidateQueries({ queryKey: ['sample-tests', String(event.entityId)] }); // Tests tab
                queryClient.invalidateQueries({ queryKey: ['dashboard'] });     // Dashboard stats
                queryClient.invalidateQueries({ queryKey: ['review-queue'] });  // Review queue
            }

            if (event.entity === 'JOB') {
                queryClient.invalidateQueries({ queryKey: ['jobs'] });
                queryClient.invalidateQueries({ queryKey: ['job', String(event.entityId)] });
                queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            }
        });

        return () => unsubscribe();
    }, [queryClient]);

    // This component renders nothing; it's purely a side-effect provider
    return null;
}
