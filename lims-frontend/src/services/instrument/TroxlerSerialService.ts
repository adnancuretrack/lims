import type { TroxlerProjectBlock } from './troxlerTypes';
import { TroxlerParser } from './TroxlerParser';

type SerialCallback<T> = (data: T) => void;

/**
 * Singleton service for managing Web Serial API connection to the Troxler Model 3440.
 * Enforces Read-Only behavior (no write/send methods provided) and configures UART
 * per gauge defaults: 9600 baud, 8-N-2, DTR hardware handshaking.
 */
class TroxlerSerialService {
  private port: any | null = null;
  private reader: any | null = null;
  private keepReading = false;
  private tokenBuffer = '';
  private readPromise: Promise<void> | null = null;
  private parser = new TroxlerParser();

  // Listeners
  private projectBlockListeners: Set<SerialCallback<TroxlerProjectBlock>> = new Set();
  private connectionChangeListeners: Set<SerialCallback<'connected' | 'disconnected' | 'error'>> = new Set();
  private errorListeners: Set<SerialCallback<Error>> = new Set();
  private garbageDataListeners: Set<SerialCallback<string>> = new Set();

  onProjectBlock(callback: SerialCallback<TroxlerProjectBlock>) {
    this.projectBlockListeners.add(callback);
    return () => this.projectBlockListeners.delete(callback);
  }

  onConnectionChange(callback: SerialCallback<'connected' | 'disconnected' | 'error'>) {
    this.connectionChangeListeners.add(callback);
    return () => this.connectionChangeListeners.delete(callback);
  }

  onError(callback: SerialCallback<Error>) {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }

  onGarbageData(callback: SerialCallback<string>) {
    this.garbageDataListeners.add(callback);
    return () => this.garbageDataListeners.delete(callback);
  }

  private notifyConnectionChange(status: 'connected' | 'disconnected' | 'error') {
    this.connectionChangeListeners.forEach(cb => cb(status));
  }

  private notifyProjectBlock(block: TroxlerProjectBlock) {
    this.projectBlockListeners.forEach(cb => cb(block));
  }

  private notifyError(error: Error) {
    this.errorListeners.forEach(cb => cb(error));
  }

  private notifyGarbageData(line: string) {
    this.garbageDataListeners.forEach(cb => cb(line));
  }

  /**
   * Connects to the Troxler serial port using Web Serial API.
   * Configured for 9600 baud, 8-N-2, DTR.
   */
  async connect(): Promise<void> {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API not supported in this browser. Please use Chrome or Edge.');
    }

    if (this.port) {
      console.warn('Already connected or connecting to Troxler port.');
      return;
    }

    try {
      this.port = await (navigator as any).serial.requestPort();

      // Configure port for Troxler 3440: 9600 bps, 8 data bits, no parity, 2 stop bits
      await this.port.open({
        baudRate: 9600,
        dataBits: 8,
        stopBits: 2,
        parity: 'none',
        flowControl: 'none',
      });

      console.log('[TROXLER CONFIG] Connected with: 9600 baud, 8-N-2');

      // Assert DTR for hardware flow control handshake
      if (this.port.setSignals) {
        await this.port.setSignals({ dataTerminalReady: true });
      }

      this.keepReading = true;
      this.parser.reset();
      this.notifyConnectionChange('connected');

      this.readPromise = this.readLoop();
    } catch (err: any) {
      this.port = null;
      this.notifyConnectionChange('error');
      this.notifyError(err);
      throw err;
    }
  }

  /**
   * Disconnects cleanly from the serial port.
   */
  async disconnect(): Promise<void> {
    if (!this.port) return;

    this.keepReading = false;

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (e) {
        console.error('Error canceling reader:', e);
      }
    }

    if (this.readPromise) {
      try {
        await this.readPromise;
      } catch (e) {
        console.error('Error waiting for read loop:', e);
      }
    }

    try {
      await this.port.close();
    } catch (e) {
      console.error('Error closing port:', e);
    }

    this.port = null;
    this.parser.reset();
    this.notifyConnectionChange('disconnected');
  }

  isConnected(): boolean {
    return this.port !== null && this.keepReading;
  }

  getPortInfo() {
    return this.port ? this.port.getInfo() : null;
  }

  private async readLoop() {
    while (this.port && this.port.readable && this.keepReading) {
      this.reader = this.port.readable.getReader();
      const decoder = new TextDecoder('utf-8');

      try {
        while (this.keepReading) {
          const { value, done } = await this.reader.read();

          if (done) {
            break;
          }

          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            console.log('[TROXLER CHUNK]', JSON.stringify(chunk));
            this.tokenBuffer += chunk;

            try {
              await this.processBuffer();
            } catch (err: any) {
              console.error('[TROXLER] Error in processBuffer:', err);
              this.notifyError(err);
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Troxler serial read error:', err);
          this.notifyConnectionChange('error');
          this.notifyError(err);
          this.keepReading = false;
        }
      } finally {
        if (this.reader) {
          this.reader.releaseLock();
          this.reader = null;
        }
      }
    }
  }

  private async processBuffer() {
    if (this.tokenBuffer.length > 20000) {
      console.warn('[TROXLER BUFFER] Buffer exceeding 20KB without finding line boundary.');
    }

    // Normalize CR/LF and CR-only line endings to \n
    this.tokenBuffer = this.tokenBuffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    let newlineIndex = this.tokenBuffer.indexOf('\n');

    while (newlineIndex !== -1) {
      const line = this.tokenBuffer.slice(0, newlineIndex);
      this.tokenBuffer = this.tokenBuffer.slice(newlineIndex + 1);

      if (line.trim().length > 0) {
        console.log('[TROXLER LINE]', JSON.stringify(line));
        const wasIdle = this.parser.getState() === 'IDLE';

        const block = await this.parser.processLine(line);

        if (block) {
          this.checkErasedProjectWarning(block);
          this.notifyProjectBlock(block);
        } else if (wasIdle && this.parser.getState() === 'IDLE') {
          this.notifyGarbageData(line);
        }
      }

      newlineIndex = this.tokenBuffer.indexOf('\n');
    }
  }

  /**
   * Firmware quirk (Section 3): Check if all station readings contain placeholders (–, +, +++++).
   * Alert operator to perform [SHIFT] -> [SPECIAL] -> [3- RECOVER ERASE] on gauge keypad.
   */
  private checkErasedProjectWarning(block: TroxlerProjectBlock) {
    const isPlaceholder = (val?: string) => !val || /^[–\-+]+$/.test(val);

    const allErased = block.stations.every(st =>
      isPlaceholder(st.wd) &&
      isPlaceholder(st.dd) &&
      isPlaceholder(st.pr) &&
      isPlaceholder(st.pctPr) &&
      isPlaceholder(st.m) &&
      isPlaceholder(st.pctM)
    );

    if (allErased && block.stations.length > 0) {
      const warningMsg = `Warning: All station measurements in Project ${block.projectId} appear erased. ` +
        `If this project was prematurely deleted, perform [SHIFT] -> [SPECIAL] -> [3- RECOVER ERASE] ` +
        `on the gauge keypad before new measurements overwrite NVRAM.`;

      console.warn('[TROXLER NVRAM ALERT]', warningMsg);
      this.notifyError(new Error(warningMsg));
    }
  }
}

export const troxlerSerialService = new TroxlerSerialService();
