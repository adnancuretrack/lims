import { useState, useEffect, useCallback } from 'react';
import { nlSerialService } from '../services/instrument/NlSerialService';
import type { NlMeasurementReport, NlConnectionState } from '../services/instrument/nlScientificTypes';

const HISTORY_SIZE = 10; // Keep the last 10 reports for history

export const useNlCapture = () => {
  const [connectionState, setConnectionState] = useState<NlConnectionState>({
    status: nlSerialService.isConnected() ? 'connected' : 'disconnected',
    portInfo: nlSerialService.getPortInfo(),
  });

  const [latestReport, setLatestReport] = useState<NlMeasurementReport | null>(null);
  const [reportHistory, setReportHistory] = useState<NlMeasurementReport[]>([]);
  const [garbageCount, setGarbageCount] = useState<number>(0);
  const [sensorFaultCount, setSensorFaultCount] = useState<number>(0);

  useEffect(() => {
    // Register listeners
    const unsubscribeConnection = nlSerialService.onConnectionChange((status) => {
      setConnectionState({
        status,
        portInfo: nlSerialService.getPortInfo(),
        errorMessage: status === 'error' ? 'A serial connection error occurred.' : undefined
      });
    });

    const unsubscribeError = nlSerialService.onError((err) => {
      setConnectionState(prev => ({ ...prev, errorMessage: err.message }));
    });

    const unsubscribeReport = nlSerialService.onReport((report) => {
      setLatestReport(report);
      setReportHistory(prev => {
        const next = [...prev, report];
        if (next.length > HISTORY_SIZE) {
          next.shift();
        }
        return next;
      });
    });

    const unsubscribeSensorFault = nlSerialService.onSensorFault(() => {
      setSensorFaultCount(prev => prev + 1);
    });

    const unsubscribeGarbage = nlSerialService.onGarbageData(() => {
        setGarbageCount(prev => prev + 1);
    });

    return () => {
      unsubscribeConnection();
      unsubscribeError();
      unsubscribeReport();
      unsubscribeSensorFault();
      unsubscribeGarbage();
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      setConnectionState(prev => ({ ...prev, status: 'connecting', errorMessage: undefined }));
      await nlSerialService.connect();
    } catch (err: any) {
      // Error is also handled by the onError listener, but we catch here so the UI can await
      console.error('Failed to connect:', err);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await nlSerialService.disconnect();
  }, []);

  const clearData = useCallback(() => {
    setLatestReport(null);
    setReportHistory([]);
    setGarbageCount(0);
    setSensorFaultCount(0);
  }, []);

  return {
    connectionState,
    latestReport,
    reportHistory,
    garbageCount,
    sensorFaultCount,
    connect,
    disconnect,
    clearData,
  };
};
