import { useState, useEffect, useCallback } from 'react';
import { adrSerialService } from '../services/instrument/AdrSerialService';
import type { AdrLiveFrame, AdrConnectionState } from '../services/instrument/adrTypes';

const HISTORY_SIZE = 50; // Keep the last 50 frames for charting if needed

export const useAdrCapture = () => {
  const [connectionState, setConnectionState] = useState<AdrConnectionState>({
    status: adrSerialService.isConnected() ? 'connected' : 'disconnected',
    portInfo: adrSerialService.getPortInfo(),
  });

  const [latestFrame, setLatestFrame] = useState<AdrLiveFrame | null>(null);
  const [liveFrameHistory, setLiveFrameHistory] = useState<AdrLiveFrame[]>([]);
  const [garbageCount, setGarbageCount] = useState<number>(0);

  useEffect(() => {
    // Register listeners
    const unsubscribeConnection = adrSerialService.onConnectionChange((status) => {
      setConnectionState({
        status,
        portInfo: adrSerialService.getPortInfo(),
        errorMessage: status === 'error' ? 'A serial connection error occurred.' : undefined
      });
    });

    const unsubscribeError = adrSerialService.onError((err) => {
      setConnectionState(prev => ({ ...prev, errorMessage: err.message }));
    });

    const unsubscribeLiveFrame = adrSerialService.onLiveFrame((frame) => {
      setLatestFrame(frame);
      setLiveFrameHistory(prev => {
        const next = [...prev, frame];
        if (next.length > HISTORY_SIZE) {
          next.shift();
        }
        return next;
      });
    });

    const unsubscribeGarbage = adrSerialService.onGarbageData(() => {
        setGarbageCount(prev => prev + 1);
    });

    return () => {
      unsubscribeConnection();
      unsubscribeError();
      unsubscribeLiveFrame();
      unsubscribeGarbage();
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      setConnectionState(prev => ({ ...prev, status: 'connecting', errorMessage: undefined }));
      await adrSerialService.connect();
    } catch (err: any) {
      // Error is also handled by the onError listener, but we catch here so the UI can await
      console.error('Failed to connect:', err);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await adrSerialService.disconnect();
  }, []);

  const clearData = useCallback(() => {
    setLatestFrame(null);
    setLiveFrameHistory([]);
    setGarbageCount(0);
  }, []);

  return {
    connectionState,
    latestFrame,
    liveFrameHistory,
    garbageCount,
    connect,
    disconnect,
    clearData,
  };
};
