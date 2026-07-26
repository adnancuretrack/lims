import type { NlMeasurementRecord } from './nlScientificTypes';

/**
 * Parses raw serial text lines from the NL Scientific NL 5032X/001 machine.
 */
export class NlDataParser {
  private static REPORT_LINE_REGEX = /^JOB:(?<job>\w+),WD:(?<wd>[\d.]+),DD:(?<dd>[\d.]+),MC:(?<mc>[\d.]+),COMP:(?<comp>[\d.]+),TEMP:(?<temp>[\d.]+)(?:,LAT:(?<lat>[-\d.]+),LON:(?<lon>[-\d.]+))?/;

  static sanitizeLine(raw: string): string {
    // Strip non-printable characters (handles power-on voltage spike garbage: 0xFF, 0x70, 0x00)
    let cleaned = raw.replace(/[^\x20-\x7E\t]/g, '');
    return cleaned.trim();
  }

  /**
   * Attempts to parse a single line into a measurement record.
   * Returns a parsed record object, or null if the line does not match the expected pattern.
   */
  static parseMeasurementLine(line: string): NlMeasurementRecord | null {
    const cleanLine = this.sanitizeLine(line);
    const match = cleanLine.match(this.REPORT_LINE_REGEX);

    if (match && match.groups) {
      const g = match.groups;
      return {
        job: g.job,
        wetDensity: parseFloat(g.wd),
        dryDensity: parseFloat(g.dd),
        moisture: parseFloat(g.mc),
        compaction: parseFloat(g.comp),
        temperature: parseFloat(g.temp),
        latitude: g.lat ? parseFloat(g.lat) : undefined,
        longitude: g.lon ? parseFloat(g.lon) : undefined,
      };
    }

    return null;
  }

  /**
   * Detects initialization glitch bytes and missing headers.
   */
  static isGarbageData(line: string): boolean {
    if (line.includes('\xFF') || line.includes('\x00') || line.includes('\x70')) return true;
    if (line.trim().length < 10) return true;
    // Check for the standard prefix keys
    if (!line.includes('JOB:')) return true;
    return false;
  }

  /**
   * Validates a parsed record for specific hardware quirks (e.g., Temperature Probe Disconnect).
   */
  static validateRecord(record: NlMeasurementRecord): { valid: boolean; fault?: string } {
    // Hardware quirk: Temperature Probe Disconnect Drift
    if (record.temperature <= 0.0 && record.wetDensity > 0.0) {
      return {
        valid: true, // we still pass the data through, but flag it
        fault: 'Temperature probe disconnected — density values may be invalid (TEMP <= 0.0)',
      };
    }
    return { valid: true };
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
