import { describe, it, expect, beforeEach } from 'vitest';
import { TroxlerParser } from '../TroxlerParser';
import { extractProjectBlock } from '../TroxlerExtractor';

const PROFILE_A_SOIL_FIXTURE = `***********************************
PROJECT NUMBER:  1
SN: 59441  DATE:   3/16/2000
*********************************
STA # 1       2:30 PM   3/16/2000
DEPTH: 4 inches
TIME: 15 seconds  UNITS: PCF  Std Cnts: D 3445 M 26
Dens Cnt. 3568 Moist Cnt. 32
WD = –    DD = –
PR = 145.0   %PR = -
M = +    %M = +++++
Optional Data: 1234567890.1**`;

describe('TroxlerParser State Machine', () => {
  let parser: TroxlerParser;

  beforeEach(() => {
    parser = new TroxlerParser();
  });

  it('1. Profile A — Soil mode complete block', async () => {
    const lines = PROFILE_A_SOIL_FIXTURE.split('\n');
    let finalBlock = null;

    for (const line of lines) {
      const result = await parser.processLine(line);
      if (result) {
        finalBlock = result;
      }
    }

    expect(finalBlock).not.toBeNull();
    expect(finalBlock?.projectId).toBe('1');
    expect(finalBlock?.serialNum).toBe('59441');
    expect(finalBlock?.date).toBe('3/16/2000');
    expect(finalBlock?.stations).toHaveLength(1);

    const sta = finalBlock!.stations[0];
    expect(sta.staNum).toBe(1);
    expect(sta.time).toBe('2:30 PM');
    expect(sta.date).toBe('3/16/2000');
    expect(sta.depth).toBe('4 inches');
    expect(sta.timeVal).toBe('15 seconds');
    expect(sta.units).toBe('PCF');
    expect(sta.stdD).toBe(3445);
    expect(sta.stdM).toBe(26);
    expect(sta.densCnt).toBe(3568);
    expect(sta.moistCnt).toBe(32);
    expect(sta.pr).toBe('145.0');
    expect(sta.optData).toBe('1234567890.1');
    expect(finalBlock?.sha256).toHaveLength(64);
  });

  it('2. Garbage before header is discarded', async () => {
    const garbageLines = [
      'SOME RANDOM LINE NOISE',
      '123456789',
      'CONNECT ERROR AT COM3',
    ];

    for (const line of garbageLines) {
      const res = await parser.processLine(line);
      expect(res).toBeNull();
    }
    expect(parser.getState()).toBe('IDLE');

    // Now send valid block
    const lines = PROFILE_A_SOIL_FIXTURE.split('\n');
    let block = null;
    for (const line of lines) {
      const res = await parser.processLine(line);
      if (res) block = res;
    }

    expect(block).not.toBeNull();
    expect(block?.projectId).toBe('1');
  });

  it('3. Malformed block — missing station header returns null without throwing', async () => {
    const malformed = `***********************************
PROJECT NUMBER:  1
SN: 59441  DATE:   3/16/2000
*********************************
NO STATION HEADER HERE
JUST RANDOM TEXT
Optional Data: test**`;

    const lines = malformed.split('\n');
    let block = null;
    for (const line of lines) {
      const res = await parser.processLine(line);
      if (res) block = res;
    }

    expect(block).toBeNull();
    expect(parser.getState()).toBe('IDLE');
  });

  it('4. Malformed block — no closing ** stays in RECORDING state', async () => {
    const incomplete = `***********************************
PROJECT NUMBER:  1
SN: 59441  DATE:   3/16/2000
*********************************
STA # 1       2:30 PM   3/16/2000
DEPTH: 4 inches`;

    const lines = incomplete.split('\n');
    for (const line of lines) {
      const res = await parser.processLine(line);
      expect(res).toBeNull();
    }

    expect(parser.getState()).toBe('RECORDING');
  });

  it('5. CR-only line endings parse identically', async () => {
    const crStream = PROFILE_A_SOIL_FIXTURE.replace(/\n/g, '\r');
    const lines = crStream.split('\r');

    let block = null;
    for (const line of lines) {
      const res = await parser.processLine(line);
      if (res) block = res;
    }

    expect(block).not.toBeNull();
    expect(block?.projectId).toBe('1');
    expect(block?.stations[0].pr).toBe('145.0');
  });

  it('6. Placeholder values (–, +, +++++) are preserved as literal strings', async () => {
    const lines = PROFILE_A_SOIL_FIXTURE.split('\n');
    let block = null;
    for (const line of lines) {
      const res = await parser.processLine(line);
      if (res) block = res;
    }

    const sta = block!.stations[0];
    expect(sta.wd).toBe('–');
    expect(sta.dd).toBe('–');
    expect(sta.m).toBe('+');
    expect(sta.pctM).toBe('+++++');
    expect(isNaN(parseFloat(sta.wd!))).toBe(true);
  });

  it('7. Multiple consecutive project blocks emit separately', async () => {
    const fixture2 = PROFILE_A_SOIL_FIXTURE.replace('PROJECT NUMBER:  1', 'PROJECT NUMBER:  2');
    const combined = `${PROFILE_A_SOIL_FIXTURE}\n${fixture2}`;
    const lines = combined.split('\n');

    const blocks: any[] = [];
    for (const line of lines) {
      const res = await parser.processLine(line);
      if (res) blocks.push(res);
    }

    expect(blocks).toHaveLength(2);
    expect(blocks[0].projectId).toBe('1');
    expect(blocks[1].projectId).toBe('2');
  });

  it('8. Empty project block (0 stations) returns null', async () => {
    const emptyProject = `***********************************
PROJECT NUMBER:  99
SN: 59441  DATE:   3/16/2000
*********************************
Optional Data: none**`;

    const lines = emptyProject.split('\n');
    let block = null;
    for (const line of lines) {
      const res = await parser.processLine(line);
      if (res) block = res;
    }

    expect(block).toBeNull();
  });
});

describe('TroxlerExtractor', () => {
  it('9. Extractor — project-level fields extraction', () => {
    const extracted = extractProjectBlock(PROFILE_A_SOIL_FIXTURE);
    expect(extracted).not.toBeNull();
    expect(extracted?.projectId).toBe('1');
    expect(extracted?.serialNum).toBe('59441');
    expect(extracted?.date).toBe('3/16/2000');
  });

  it('10. Extractor — station fields extraction', () => {
    const extracted = extractProjectBlock(PROFILE_A_SOIL_FIXTURE);
    expect(extracted?.stations).toHaveLength(1);
    const sta = extracted!.stations[0];

    expect(sta.staNum).toBe(1);
    expect(sta.time).toBe('2:30 PM');
    expect(sta.date).toBe('3/16/2000');
    expect(sta.depth).toBe('4 inches');
    expect(sta.timeVal).toBe('15 seconds');
    expect(sta.units).toBe('PCF');
    expect(sta.stdD).toBe(3445);
    expect(sta.stdM).toBe(26);
    expect(sta.densCnt).toBe(3568);
    expect(sta.moistCnt).toBe(32);
    expect(sta.pr).toBe('145.0');
    expect(sta.pctPr).toBe('-');
    expect(sta.optData).toBe('1234567890.1');
  });

  it('11. SHA-256 integrity hash is 64 hex characters', async () => {
    const hash = await TroxlerParser.computeIntegrityHash(PROFILE_A_SOIL_FIXTURE);
    expect(hash).toMatch(/^[a-f0-9]{64}$/i);
  });
});
