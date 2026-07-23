import type { AdrReportField } from './adrTypes';

/**
 * Parses raw serial text lines from the ELE ADR Touch machine.
 */
export class AdrDataParser {
  private static REPORT_LINE_REGEX = /^(.+?)\s{2,}(\S+(?:\s\S+)*?)(?:\s{2,}(\S+))?\s*$/;

  static sanitizeLine(raw: string): string {
      // Strip non-printable characters (keep space through tilde, plus tab)
      let cleaned = raw.replace(/[^\x20-\x7E\t]/g, '');
      // Normalize tabs to spaces
      cleaned = cleaned.replace(/\t/g, ' ');
      return cleaned.trim();
  }

  /**
   * Attempts to parse a single line from a print report.
   * Returns a parsed field object, or null if the line is a header/annotation/garbage.
   */
  static parseReportLine(line: string): AdrReportField | null {
    const cleanLine = this.sanitizeLine(line);
    if (cleanLine !== line.trim()) {
        console.log('[ADR SANITIZE] Stripped non-printable chars:', JSON.stringify(line), '→', JSON.stringify(cleanLine));
    }

    const match = cleanLine.match(this.REPORT_LINE_REGEX);

    if (match) {
      let label = match[1].trim();
      let value = match[2].trim();
      let unit = match[3] ? match[3].trim() : undefined;
      let numericValue: number | undefined;

      // Special handling for Operating Mode
      if (label === 'Operating Mode' && value.includes(' : ')) {
         value = value;
      } else {
         const parsedNum = parseFloat(value);
         if (!isNaN(parsedNum)) {
             numericValue = parsedNum;
         }
      }

      // Ignore single words or annotations that happen to get matched incorrectly
      if (label.startsWith('(') && label.endsWith(')')) {
          return null;
      }

      return {
        label,
        value,
        unit,
        numericValue
      };
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
