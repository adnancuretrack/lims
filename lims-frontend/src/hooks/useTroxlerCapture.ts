import { useState, useEffect, useCallback } from 'react';
import { troxlerSerialService } from '../services/instrument/TroxlerSerialService';
import type { TroxlerUartSettings } from '../services/instrument/TroxlerSerialService';
import type { TroxlerProjectBlock, TroxlerConnectionState } from '../services/instrument/troxlerTypes';

const HISTORY_SIZE = 10;

export const useTroxlerCapture = () => {
  const [connectionState, setConnectionState] = useState<TroxlerConnectionState>({
    status: troxlerSerialService.isConnected() ? 'connected' : 'disconnected',
    portInfo: troxlerSerialService.getPortInfo(),
  });

  const [latestBlock, setLatestBlock] = useState<TroxlerProjectBlock | null>(null);
  const [blockHistory, setBlockHistory] = useState<TroxlerProjectBlock[]>([]);
  const [garbageCount, setGarbageCount] = useState<number>(0);

  useEffect(() => {
    const unsubscribeConnection = troxlerSerialService.onConnectionChange((status) => {
      setConnectionState({
        status,
        portInfo: troxlerSerialService.getPortInfo(),
        errorMessage: status === 'error' ? 'A Troxler serial connection error occurred.' : undefined
      });
    });

    const unsubscribeError = troxlerSerialService.onError((err) => {
      setConnectionState(prev => ({ ...prev, errorMessage: err.message }));
    });

    const unsubscribeBlock = troxlerSerialService.onProjectBlock((block) => {
      setLatestBlock(block);
      setBlockHistory(prev => {
        const next = [...prev, block];
        if (next.length > HISTORY_SIZE) {
          next.shift();
        }
        return next;
      });
    });

    const unsubscribeGarbage = troxlerSerialService.onGarbageData(() => {
      setGarbageCount(prev => prev + 1);
    });

    return () => {
      unsubscribeConnection();
      unsubscribeError();
      unsubscribeBlock();
      unsubscribeGarbage();
    };
  }, []);

  // TEMPORARY: Accept optional UART settings from modal dropdowns
  const connect = useCallback(async (settings?: TroxlerUartSettings) => {
    try {
      setConnectionState(prev => ({ ...prev, status: 'connecting', errorMessage: undefined }));
      await troxlerSerialService.connect(settings);
    } catch (err: any) {
      console.error('Failed to connect to Troxler gauge:', err);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await troxlerSerialService.disconnect();
  }, []);

  const clearData = useCallback(() => {
    setLatestBlock(null);
    setBlockHistory([]);
    setGarbageCount(0);
  }, []);

  return {
    connectionState,
    latestBlock,
    blockHistory,
    garbageCount,
    connect,
    disconnect,
    clearData,
  };
};
