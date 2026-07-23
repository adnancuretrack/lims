import { useState, useEffect, useCallback } from 'react';
import { adrSerialService } from '../services/instrument/AdrSerialService';
import type { AdrPrintReport, AdrConnectionState } from '../services/instrument/adrTypes';

const HISTORY_SIZE = 10; // Keep the last 10 reports for history

export const useAdrCapture = () => {
  const [connectionState, setConnectionState] = useState<AdrConnectionState>({
    status: adrSerialService.isConnected() ? 'connected' : 'disconnected',
    portInfo: adrSerialService.getPortInfo(),
  });

  const [latestReport, setLatestReport] = useState<AdrPrintReport | null>(null);
  const [reportHistory, setReportHistory] = useState<AdrPrintReport[]>([]);
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

    const unsubscribeReport = adrSerialService.onReport((report) => {
      setLatestReport(report);
      setReportHistory(prev => {
        const next = [...prev, report];
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
      unsubscribeReport();
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
    setLatestReport(null);
    setReportHistory([]);
    setGarbageCount(0);
  }, []);

  return {
    connectionState,
    latestReport,
    reportHistory,
    garbageCount,
    connect,
    disconnect,
    clearData,
  };
};
