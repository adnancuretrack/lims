import type { TroxlerProjectBlock } from './troxlerTypes';
import { extractProjectBlock } from './TroxlerExtractor';

export class TroxlerParser {
  private static HEADER_BOUND = /^\*{20,}$/;
  private static BLOCK_END = /\*\*\s*$/;

  private state: 'IDLE' | 'RECORDING' = 'IDLE';
  private blockBuffer: string[] = [];

  static sanitizeLine(raw: string): string {
    // Strip control characters (keep space through tilde, tab, and printable unicode like en-dash \u2013)
    let cleaned = raw.replace(/[\x00-\x08\x0B-\x1F\x7F]/g, '');
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
  getState(): 'IDLE' | 'RECORDING' {
    return this.state;
  }

  /**
   * Feeds one line into the Troxler state machine.
   * Returns a complete TroxlerProjectBlock when a terminating block is reached, or null otherwise.
   */
  async processLine(rawLine: string): Promise<TroxlerProjectBlock | null> {
    const line = TroxlerParser.sanitizeLine(rawLine);

    if (TroxlerParser.HEADER_BOUND.test(line)) {
      if (this.state === 'IDLE') {
        console.log('[TROXLER STATE] IDLE -> RECORDING (Header match)');
        this.state = 'RECORDING';
        this.blockBuffer = [line];
      } else {
        // Already in RECORDING state; this is the inner asterisk boundary line below SN/DATE
        this.blockBuffer.push(line);
      }
      return null;
    }

    if (this.state === 'IDLE') {
      // Discard garbage line-noise bytes when not recording
      return null;
    }

    // Currently in RECORDING state
    this.blockBuffer.push(line);

    if (TroxlerParser.BLOCK_END.test(line)) {
      console.log('[TROXLER STATE] RECORDING -> IDLE (Block end match)');
      const rawText = this.blockBuffer.join('\n');
      this.state = 'IDLE';
      this.blockBuffer = [];

      const extracted = extractProjectBlock(rawText);
      if (!extracted) {
        console.error('[TROXLER] Discarded malformed project block (extraction/validation failed).');
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
}
