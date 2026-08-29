import type { TroxlerProjectBlock } from './troxlerTypes';
import { extractProjectBlock, extractProjectBlockFromCsv } from './TroxlerExtractor';

export class TroxlerParser {
  private static HEADER_BOUND = /^\*{20,}$/;
  private static BLOCK_END = /\*\*\s*$/;
  private static CSV_HEADER = /^[\f\s]*Record,Date-Time,Project/i;

  private state: 'IDLE' | 'RECORDING_TEXT' | 'RECORDING_CSV' = 'IDLE';
  private blockBuffer: string[] = [];

  static sanitizeLine(raw: string): string {
    // Strip control characters (keep space through tilde, tab, \f form feed, and printable unicode)
    let cleaned = raw.replace(/[\x00-\x08\x0B\x0E-\x1F\x7F]/g, '');
    cleaned = cleaned.replace(/\t/g, ' ');
    return cleaned.trim();
  }

  static async computeIntegrityHash(raw: string): Promise<string> {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      return btoa(raw).substring(0, 64);
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Resets state machine back to IDLE.
   */
  reset(): void {
    this.state = 'IDLE';
    this.blockBuffer = [];
  }

  /**
   * Gets current state machine state.
   */
  getState(): 'IDLE' | 'RECORDING_TEXT' | 'RECORDING_CSV' {
    return this.state;
  }

  /**
   * Feeds one line into the Troxler state machine.
   * Returns a complete TroxlerProjectBlock when a terminating block is reached, or null otherwise.
   */
  async processLine(rawLine: string): Promise<TroxlerProjectBlock | null> {
    const line = TroxlerParser.sanitizeLine(rawLine);

    // If currently recording CSV and a form feed \f (end of stream) is received:
    if (this.state === 'RECORDING_CSV' && rawLine.includes('\f')) {
      if (line && !TroxlerParser.CSV_HEADER.test(line)) {
        this.blockBuffer.push(line);
      }
      console.log('[TROXLER STATE] RECORDING_CSV -> IDLE (Form feed end detected)');
      return await this.finalizeCsvBlock();
    }

    if (!line) return null;

    // Check CSV stream header start
    if (TroxlerParser.CSV_HEADER.test(line)) {
      console.log('[TROXLER STATE] IDLE -> RECORDING_CSV (Header match)');
      this.state = 'RECORDING_CSV';
      this.blockBuffer = [line];
      return null;
    }

    // Check Text report header start
    if (TroxlerParser.HEADER_BOUND.test(line)) {
      if (this.state === 'IDLE') {
        console.log('[TROXLER STATE] IDLE -> RECORDING_TEXT (Header match)');
        this.state = 'RECORDING_TEXT';
        this.blockBuffer = [line];
      } else if (this.state === 'RECORDING_TEXT') {
        this.blockBuffer.push(line);
      }
      return null;
    }

    if (this.state === 'RECORDING_CSV') {
      this.blockBuffer.push(line);

      // Check if this line contains \f (Form Feed end marker)
      if (rawLine.includes('\f') || line.includes('\f')) {
        console.log('[TROXLER STATE] RECORDING_CSV -> IDLE (Form feed end detected)');
        return await this.finalizeCsvBlock();
      }
      return null;
    }

    if (this.state === 'RECORDING_TEXT') {
      this.blockBuffer.push(line);

      if (TroxlerParser.BLOCK_END.test(line)) {
        console.log('[TROXLER STATE] RECORDING_TEXT -> IDLE (Block end match)');
        const rawText = this.blockBuffer.join('\n');
        this.state = 'IDLE';
        this.blockBuffer = [];

        const extracted = extractProjectBlock(rawText);
        if (!extracted) {
          console.error('[TROXLER] Discarded malformed text project block.');
          return null;
        }

        const hash = await TroxlerParser.computeIntegrityHash(rawText);
        const block: TroxlerProjectBlock = {
          ...extracted,
          rawText,
          sha256: hash,
          capturedAt: new Date().toISOString(),
        };

        console.log('[TROXLER BLOCK]', block);
        return block;
      }
      return null;
    }

    // Standalone CSV line fallback (record number + date format, e.g. "1,08/27/26 10:33a...")
    if (this.state === 'IDLE' && /^\d+,\d{2}\/\d{2}\/\d{2}/.test(line)) {
      const virtualHeader = 'Record,Date-Time,Project,User,Mode,Units,Location,Note,WD,DD,Moist,%Moist,%Gmb,%Voids,%Pr,%Voids-Soil,VoidRatio,Lat,Longitude,CL Side,CL Dist,Gmb Target,Gmm Target,Proctor Target,Sp Gravity,Bottom Layer Density,Top Layer Thickness,Density Offset,Moisture Offset,Trench D Offset,Trench M Offset,Model Number,Serial Number,Depth,Time,Dens Std,Moist Std,DC,MC';
      const extracted = extractProjectBlockFromCsv([virtualHeader, line]);
      if (extracted) {
        const hash = await TroxlerParser.computeIntegrityHash(line);
        const block: TroxlerProjectBlock = {
          ...extracted,
          rawText: line,
          sha256: hash,
          capturedAt: new Date().toISOString(),
        };
        console.log('[TROXLER SINGLE CSV BLOCK]', block);
        return block;
      }
    }

    return null;
  }

  /**
   * Finalizes an accumulated CSV block.
   */
  async finalizeCsvBlock(): Promise<TroxlerProjectBlock | null> {
    if (this.blockBuffer.length === 0) return null;

    const rawText = this.blockBuffer.join('\n');
    const lines = [...this.blockBuffer];
    this.state = 'IDLE';
    this.blockBuffer = [];

    const extracted = extractProjectBlockFromCsv(lines);
    if (!extracted) {
      console.error('[TROXLER] Discarded malformed CSV project block.');
      return null;
    }

    const hash = await TroxlerParser.computeIntegrityHash(rawText);
    const block: TroxlerProjectBlock = {
      ...extracted,
      rawText,
      sha256: hash,
      capturedAt: new Date().toISOString(),
    };

    console.log('[TROXLER CSV BLOCK]', block);
    return block;
  }
}
