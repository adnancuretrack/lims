import type { AdrLiveFrame } from './adrTypes';

/**
 * Parses raw serial text lines from the ELE ADR Touch machine.
 */
export class AdrDataParser {
  // Pattern based on integration guide:
  // TIME: 002.4s  LOAD: 0045.2 kN  STRESS: 001.81 MPa  PACE: 00.25 MPa/s
  private static LIVE_FRAME_REGEX = /TIME:\s*(?<time>[\d.-]+)\s*s[,]?\s*LOAD:\s*(?<load>[\d.-]+)\s*kN[,]?\s*STRESS:\s*(?<stress>[\d.-]+)\s*MPa[,]?\s*PACE:\s*(?<pace>[\d.-]+)\s*MPa\s*\/\s*s/i;

  static sanitizeLine(raw: string): string {
      // Strip non-printable characters (keep space through tilde, plus tab)
      let cleaned = raw.replace(/[^\x20-\x7E\t]/g, '');
      // Normalize tabs to spaces
      cleaned = cleaned.replace(/\t/g, ' ');
      return cleaned.trim();
  }

  /**
   * Attempts to parse a line as a Profile A live data frame.
   * Returns null if it doesn't match the expected format.
   */
  static async parseLiveFrame(line: string): Promise<AdrLiveFrame | null> {
    const cleanLine = this.sanitizeLine(line);
    if (cleanLine !== line.trim()) {
        console.log('[ADR SANITIZE] Stripped non-printable chars:', JSON.stringify(line), '→', JSON.stringify(cleanLine));
    }

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

    if (this.isGarbageData(line)) {
      return null;
    }

    return null;
  }

  /**
   * Detects initialization glitch bytes and non-printable characters.
   */
  static isGarbageData(line: string): boolean {
    if (line.includes('\xFF') || line.includes('\x00')) return true;
    if (line.trim().length < 10) return true;
    return false;
  }

  /**
   * Computes a SHA-256 hash of the raw string for integrity validation.
   */
  static async computeIntegrityHash(raw: string): Promise<string> {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
        // Fallback: return a base64-encoded fingerprint when crypto.subtle is unavailable
        return btoa(raw).substring(0, 64);
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
