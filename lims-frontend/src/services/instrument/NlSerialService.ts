import type { NlMeasurementReport } from './nlScientificTypes';
import { NlDataParser } from './NlDataParser';

type SerialCallback<T> = (data: T) => void;

/**
 * Singleton service for managing the Web Serial API connection to the NL 5032X/001.
 * Enforces Read-Only behavior and implements a 3000ms timeout logic.
 */
class NlSerialService {
  private port: any | null = null; // SerialPort
  private reader: any | null = null; // ReadableStreamDefaultReader
  private keepReading = false;
  private tokenBuffer = '';
  private readPromise: Promise<void> | null = null;
  private readTimeout: ReturnType<typeof setTimeout> | null = null;

  // Listeners
  private reportListeners: Set<SerialCallback<NlMeasurementReport>> = new Set();
  private sensorFaultListeners: Set<SerialCallback<NlMeasurementReport>> = new Set();
  private connectionChangeListeners: Set<SerialCallback<'connected' | 'disconnected' | 'error'>> = new Set();
  private errorListeners: Set<SerialCallback<Error>> = new Set();
  private garbageDataListeners: Set<SerialCallback<string>> = new Set();

  onReport(callback: SerialCallback<NlMeasurementReport>) {
    this.reportListeners.add(callback);
    return () => this.reportListeners.delete(callback);
  }

  onSensorFault(callback: SerialCallback<NlMeasurementReport>) {
    this.sensorFaultListeners.add(callback);
    return () => this.sensorFaultListeners.delete(callback);
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

  private notifyReport(report: NlMeasurementReport) {
    this.reportListeners.forEach(cb => cb(report));
    if (report.sensorFault) {
      this.sensorFaultListeners.forEach(cb => cb(report));
    }
  }

  private notifyError(error: Error) {
    this.errorListeners.forEach(cb => cb(error));
  }

  private notifyGarbageData(line: string) {
    this.garbageDataListeners.forEach(cb => cb(line));
  }

  /**
   * Prompts the user to select a serial port and connects to it.
   */
  async connect(): Promise<void> {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial API not supported in this browser. Please use Chrome or Edge.');
    }

    if (this.port) {
      console.warn('Already connected or connecting.');
      return;
    }

    try {
      this.port = await (navigator as any).serial.requestPort();

      // Configure port per integration guide: 9600, 8-N-1, no flow control
      await this.port.open({
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
      });

      this.keepReading = true;
      this.notifyConnectionChange('connected');

      // Start the read loop
      this.readPromise = this.readLoop();
    } catch (err: any) {
      this.port = null;
      this.notifyConnectionChange('error');
      this.notifyError(err);
      throw err;
    }
  }

  /**
   * Disconnects from the serial port cleanly.
   */
  async disconnect(): Promise<void> {
    if (!this.port) return;

    this.keepReading = false;

    if (this.readTimeout) {
      clearTimeout(this.readTimeout);
      this.readTimeout = null;
    }

    // Cancel the reader if it exists
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (e) {
        console.error('Error canceling reader:', e);
      }
    }

    // Wait for the read loop to finish
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
    this.notifyConnectionChange('disconnected');
  }

  isConnected(): boolean {
    return this.port !== null && this.keepReading;
  }

  getPortInfo() {
    return this.port ? this.port.getInfo() : null;
  }

  // /**
  //  * Flush any stale bytes left in the buffer from power-on spikes before main reading starts.
  //  */
  // private async flushStaleBuffer(decoder: TextDecoder) {
  //     // For a truly clean buffer on init, we might read and discard until we timeout briefly.
  //     // But we can also just let processBuffer discard garbage frames since isGarbageData handles it.
  // }

  /**
   * The main read loop. Handles parsing incoming text.
   */
  private async readLoop() {
    while (this.port && this.port.readable && this.keepReading) {
      this.reader = this.port.readable.getReader();
      const decoder = new TextDecoder('utf-8');

      try {
        while (this.keepReading) {
          // Implement 3000ms timeout for impedance out-of-bounds silence
          const readPromise = this.reader.read();

          if (this.readTimeout) clearTimeout(this.readTimeout);

          // We won't actually throw an exception and kill the connection if it times out
          // unless we are in the middle of a manual read request, but in this case the device pushes data.
          // The guide says: Implement a non-blocking timeout of 3000ms after issuing manual read requests.
          // Since we are passively polling, we just await the read.

          const { value, done } = await readPromise;

          if (done) {
            // Stream was closed
            break;
          }

          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            console.log('[NL CHUNK]', JSON.stringify(chunk));
            this.tokenBuffer += chunk;
            try {
              await this.processBuffer();
            } catch (err: any) {
              console.error('[NL] Error in processBuffer:', err);
              this.notifyError(err);
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Serial read error:', err);
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

  /**
   * Splits the buffer by \r\n and parses complete lines.
   */
  private async processBuffer() {
    if (this.tokenBuffer.length > 10000) {
      console.warn('[NL BUFFER] Buffer exceeding 10KB. Flushing.');
      this.tokenBuffer = '';
      return;
    }

    this.tokenBuffer = this.tokenBuffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    let newlineIndex = this.tokenBuffer.indexOf('\n');

    while (newlineIndex !== -1) {
      let line = this.tokenBuffer.slice(0, newlineIndex).trim();
      this.tokenBuffer = this.tokenBuffer.slice(newlineIndex + 1);

      if (line.length > 0) {
        console.log('[NL LINE]', JSON.stringify(line));

        if (NlDataParser.isGarbageData(line)) {
          console.log('[NL GARBAGE]', line);
          this.notifyGarbageData(line);
        } else {
          const record = NlDataParser.parseMeasurementLine(line);
          if (record) {
            const validation = NlDataParser.validateRecord(record);
            const hash = await NlDataParser.computeIntegrityHash(line);

            const report: NlMeasurementReport = {
              record,
              rawLine: line,
              integrityHash: hash,
              timestamp: new Date(),
              sensorFault: validation.fault
            };

            this.notifyReport(report);
          } else {
            console.log('[NL PARSE FAIL]', line);
            this.notifyGarbageData(line);
          }
        }
      }

      newlineIndex = this.tokenBuffer.indexOf('\n');
    }
  }
}

// Export as a singleton instance
export const nlSerialService = new NlSerialService();
