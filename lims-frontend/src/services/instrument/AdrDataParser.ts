import type { AdrLiveFrame } from './adrTypes';

/**
 * Parses raw serial text lines from the ELE ADR Touch machine.
 */
export class AdrDataParser {
  // Pattern based on integration guide:
  // TIME: 002.4s  LOAD: 0045.2 kN  STRESS: 001.81 MPa  PACE: 00.25 MPa/s
  private static LIVE_FRAME_REGEX = /^TIME:\s*(?<time>[\d.]+)\s*s\s*LOAD:\s*(?<load>[\d.]+)\s*kN\s*STRESS:\s*(?<stress>[\d.]+)\s*MPa\s*PACE:\s*(?<pace>[\d.-]+)\s*MPa\/s/;

  /**
   * Attempts to parse a line as a Profile A live data frame.
   * Returns null if it doesn't match the expected format.
   */
  static async parseLiveFrame(line: string): Promise<AdrLiveFrame | null> {
    if (this.isGarbageData(line)) {
      return null;
    }

    const cleanLine = line.trim();
    const match = cleanLine.match(this.LIVE_FRAME_REGEX);

    if (match && match.groups) {
      const { time, load, stress, pace } = match.groups;
      
      const hash = await this.computeIntegrityHash(cleanLine);

      return {
        time: parseFloat(time),
        load: parseFloat(load),
        stress: parseFloat(stress),
        pace: parseFloat(pace),
        rawLine: cleanLine,
        integrityHash: hash,
        timestamp: new Date()
      };
    }

    return null;
  }

  /**
   * Detects initialization glitch bytes and non-printable characters.
   */
  static isGarbageData(line: string): boolean {
    // Check for common glitch bytes 0xFF, 0x00
    if (line.includes('\xFF') || line.includes('\x00')) {
      return true;
    }

    // A valid live frame should at least start with 'TIME:'
    if (!line.trim().startsWith('TIME:')) {
        return true;
    }

    return false;
  }

  /**
   * Computes a SHA-256 hash of the raw string for integrity validation.
   */
  static async computeIntegrityHash(raw: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
