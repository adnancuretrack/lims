import type { TroxlerProjectBlock, TroxlerStationRecord } from './troxlerTypes';

const RE_PROJECT_ID = /PROJECT NUMBER:\s*(?<project_id>.+)/;
const RE_META = /SN:\s*(?<serial_num>\d+)\s+DATE:\s*(?<date>[\d/]+)/;
const RE_STA_HEADER = /STA #\s*(?<sta_num>\d+)\s+(?<time>\d+:\d+\s*[AP]M)\s+(?<date>[\d/]+)/;
const RE_STA_PARAMS = /DEPTH:\s*(?<depth>.+?)\s+TIME:\s*(?<time_val>.+?)\s+UNITS:\s*(?<units>\w+)\s+Std Cnts:\s*D\s*(?<std_d>\d+)\s+M\s*(?<std_m>\d+)/;
const RE_RAW_COUNTS = /Dens Cnt\.\s*(?<dens_cnt>\d+)\s+Moist Cnt\.\s*(?<moist_cnt>\d+)/;
const RE_SOIL = /WD\s*=\s*(?<wd>[-–+\d.]+)\s+DD\s*=\s*(?<dd>[-–+\d.]+)\s+PR\s*=\s*(?<pr>[-–+\d.]+)\s+%PR\s*=\s*(?<pct_pr>[-–+\d.]+)/;
const RE_MOISTURE = /M\s*=\s*(?<m>[-–+\d.]+)\s+%M\s*=\s*(?<pct_m>[-–+\d+.]+)/;
const RE_OPTIONAL = /Optional Data:\s*(?<opt_data>.*?)\*\*/;

/**
 * Splits a raw project block into per-station text chunks.
 * Separated either by dashed rules (---) or by "STA #" header boundaries.
 */
function splitStations(rawText: string): string[] {
  let chunks = rawText
    .split(/^-{3,}\s*$/m)
    .map(s => s.trim())
    .filter(Boolean);

  if (chunks.length <= 1) {
    chunks = rawText
      .split(/(?=STA #)/m)
      .map(s => s.trim())
      .filter(s => s.startsWith('STA #'));
  }

  return chunks;
}

/**
 * Extracts a single station record from a station text chunk.
 */
function extractStation(chunk: string): TroxlerStationRecord | null {
  const staMatch = RE_STA_HEADER.exec(chunk);
  const paramsMatch = RE_STA_PARAMS.exec(chunk);
  const countsMatch = RE_RAW_COUNTS.exec(chunk);

  if (!staMatch?.groups || !paramsMatch?.groups || !countsMatch?.groups) {
    return null;
  }

  const sta = staMatch.groups;
  const params = paramsMatch.groups;
  const counts = countsMatch.groups;

  const soil = RE_SOIL.exec(chunk)?.groups;
  const moisture = RE_MOISTURE.exec(chunk)?.groups;
  const optional = RE_OPTIONAL.exec(chunk)?.groups;

  return {
    staNum: parseInt(sta.sta_num, 10),
    time: sta.time.trim(),
    date: sta.date.trim(),
    depth: params.depth.trim(),
    timeVal: params.time_val.trim(),
    units: params.units.trim(),
    stdD: parseInt(params.std_d, 10),
    stdM: parseInt(params.std_m, 10),
    densCnt: parseInt(counts.dens_cnt, 10),
    moistCnt: parseInt(counts.moist_cnt, 10),
    wd: soil?.wd?.trim(),
    dd: soil?.dd?.trim(),
    pr: soil?.pr?.trim(),
    pctPr: soil?.pct_pr?.trim(),
    m: moisture?.m?.trim(),
    pctM: moisture?.pct_m?.trim(),
    optData: optional?.opt_data?.trim(),
  };
}

/**
 * Extracts project block details and station records from raw project text.
 * Returns null if the block fails structural validation.
 */
export function extractProjectBlock(
  rawText: string
): Pick<TroxlerProjectBlock, 'projectId' | 'serialNum' | 'date' | 'stations'> | null {
  const projectMatch = RE_PROJECT_ID.exec(rawText)?.groups;
  const metaMatch = RE_META.exec(rawText)?.groups;

  if (!projectMatch || !metaMatch) {
    return null;
  }

  const stationChunks = splitStations(rawText);
  const stations: TroxlerStationRecord[] = [];

  for (const chunk of stationChunks) {
    const station = extractStation(chunk);
    if (station) {
      stations.push(station);
    }
  }

  if (stations.length === 0) {
    return null;
  }

  return {
    projectId: projectMatch.project_id.trim(),
    serialNum: metaMatch.serial_num.trim(),
    date: metaMatch.date.trim(),
    stations,
  };
}

/**
 * Extracts project block details and station records from CSV lines.
 * Handles Troxler CSV stream format:
 * Record,Date-Time,Project,User,Mode,Units,Location,Note,WD,DD,Moist,%Moist,%Gmb,%Voids,%Pr...
 */
export function extractProjectBlockFromCsv(
  lines: string[]
): Pick<TroxlerProjectBlock, 'projectId' | 'serialNum' | 'date' | 'stations'> | null {
  const cleanLines = lines
    .map(l => l.replace(/\f/g, '').trim())
    .filter(Boolean);

  if (cleanLines.length === 0) return null;

  // Find header index
  const headerIdx = cleanLines.findIndex(l => /^Record,Date-Time/i.test(l));
  if (headerIdx === -1) return null;

  const headerCols = cleanLines[headerIdx].split(',').map(c => c.trim().toLowerCase());

  const getColIdx = (name: string) => headerCols.indexOf(name.toLowerCase());

  const idxRecord = getColIdx('Record');
  const idxDateTime = getColIdx('Date-Time');
  const idxProject = getColIdx('Project');
  const idxUnits = getColIdx('Units');
  const idxWd = getColIdx('WD');
  const idxDd = getColIdx('DD');
  const idxMoist = getColIdx('Moist');
  const idxPctMoist = getColIdx('%Moist');
  const idxPctPr = getColIdx('%Pr');
  const idxProctorTarget = getColIdx('Proctor Target');
  const idxSerial = getColIdx('Serial Number');
  const idxDepth = getColIdx('Depth');
  const idxTime = getColIdx('Time');
  const idxDensStd = getColIdx('Dens Std');
  const idxMoistStd = getColIdx('Moist Std');
  const idxDC = getColIdx('DC');
  const idxMC = getColIdx('MC');

  const stations: TroxlerStationRecord[] = [];
  let projectId = 'UNKNOWN';
  let serialNum = 'UNKNOWN';
  let projectDate = new Date().toLocaleDateString();

  for (let i = headerIdx + 1; i < cleanLines.length; i++) {
    const line = cleanLines[i];
    if (!line || /^Record,Date-Time/i.test(line)) continue;

    const cols = line.split(',').map(c => c.trim());
    if (cols.length < 5) continue;

    const getValue = (idx: number): string | undefined => {
      if (idx === -1 || idx >= cols.length) return undefined;
      const val = cols[idx];
      return val === 'NA' || val === 'N/A' || val === '' ? undefined : val;
    };

    const staNumStr = getValue(idxRecord);
    const staNum = staNumStr ? parseInt(staNumStr, 10) : stations.length + 1;
    if (isNaN(staNum)) continue;

    const dateTimeStr = getValue(idxDateTime) || '';
    const [dPart, ...tParts] = dateTimeStr.split(/\s+/);
    const dateStr = dPart || projectDate;
    const timeStr = tParts.join(' ') || '';

    const proj = getValue(idxProject);
    if (proj) projectId = proj;

    const sn = getValue(idxSerial);
    if (sn) serialNum = sn;

    if (dateStr) projectDate = dateStr;

    const parseNum = (idx: number, defaultVal = 0): number => {
      const v = getValue(idx);
      if (!v) return defaultVal;
      const n = parseInt(v, 10);
      return isNaN(n) ? defaultVal : n;
    };

    const station: TroxlerStationRecord = {
      staNum,
      time: timeStr,
      date: dateStr,
      depth: getValue(idxDepth) || '—',
      timeVal: getValue(idxTime) || '—',
      units: getValue(idxUnits) || 'kg/m3',
      stdD: parseNum(idxDensStd),
      stdM: parseNum(idxMoistStd),
      densCnt: parseNum(idxDC),
      moistCnt: parseNum(idxMC),
      wd: getValue(idxWd),
      dd: getValue(idxDd),
      pr: getValue(idxProctorTarget),
      pctPr: getValue(idxPctPr),
      m: getValue(idxMoist),
      pctM: getValue(idxPctMoist),
    };

    stations.push(station);
  }

  if (stations.length === 0) return null;

  return {
    projectId,
    serialNum,
    date: projectDate,
    stations,
  };
}
