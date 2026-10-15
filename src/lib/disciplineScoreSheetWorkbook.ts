import XLSX from 'xlsx-js-style';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

export interface DisciplineScoreSheetRound {
  id: string;
  class_name: string;
  class_type: string;
  games_subclass?: string | null;
  judge_name: string;
  round_number?: number;
}

export interface DisciplineScoreSheetLine {
  selectionId: string;
  roundId: string;
  handler: string;
  dog: string;
  registration: string;
  breed?: string | null;
  division?: string | null;
  entryType?: string | null;
  jumpHeight?: string | null;
  runningPosition: number | null;
}

export type OfficialObedienceTemplates = Partial<Record<1 | 2 | 3 | 4 | 5, Uint8Array>>;

interface Exercise {
  name: string;
  points: number;
}

interface CardRange {
  start: number;
  end: number;
  discipline: string;
  exerciseCount: number;
}

const OBEDIENCE_EXERCISES: Record<number, Exercise[]> = {
  1: [
    { name: 'On-Leash Heeling', points: 40 },
    { name: 'Forward (tie-breaker)', points: 20 },
    { name: 'Call to Heel', points: 10 },
    { name: 'Position Change', points: 10 },
    { name: 'Walk Around', points: 10 },
    { name: 'Greeting', points: 10 },
  ],
  2: [
    { name: 'On-Leash Heeling', points: 25 },
    { name: 'Figure 8 (tie-breaker)', points: 15 },
    { name: 'Call to Heel', points: 10 },
    { name: 'Position Change', points: 10 },
    { name: 'Stand for Handler Exam', points: 15 },
    { name: 'Recall Over Jump', points: 15 },
    { name: 'Leave Dog for Leash', points: 10 },
  ],
  3: [
    { name: 'Off-Leash Heeling', points: 25 },
    { name: 'Signals', points: 10 },
    { name: 'Drop on Recall', points: 10 },
    { name: 'Retrieve over Broad Jump', points: 15 },
    { name: 'Go Out (tie-breaker)', points: 15 },
    { name: 'Directed Jump', points: 15 },
    { name: 'Find Front', points: 10 },
  ],
  4: [
    { name: 'Signals', points: 15 },
    { name: 'Moving Down', points: 10 },
    { name: 'Double Recall', points: 15 },
    { name: 'Directed Glove', points: 15 },
    { name: 'Moving Stand Exam', points: 15 },
    { name: 'Go Out — Jump / Tunnel', points: 30 },
  ],
  5: [
    { name: 'Off-Leash Heeling / Figure 8', points: 25 },
    { name: 'Signals', points: 15 },
    { name: 'Seek Dropped Item', points: 10 },
    { name: 'Moving Down', points: 10 },
    { name: 'Find Front', points: 10 },
    { name: 'Moving Stand Exam', points: 15 },
    { name: 'Retrieve over Broad Jump', points: 15 },
    { name: 'Scent Articles', points: 15 },
    { name: 'Go Out — Jump / Tunnel', points: 20 },
    { name: 'Double Recall', points: 15 },
  ],
};

const levelFromClassName = (className: string) => {
  const match = className.match(/(?:obedience\s*)?(?:level\s*)?([1-5])\b/i);
  return match ? Number(match[1]) : 1;
};

const safeSheetName = (value: string, suffix: string) =>
  `${value.replace(/[:\\/?*[\]]/g, '').slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;

const OFFICIAL_OBEDIENCE_SHEETS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'CTH',
  2: 'v.1',
  3: 'heel',
  4: 'M.Down',
  // The first Level 5 tab contains sample trial information. This is the
  // equivalent clean official sheet supplied in the same C-WAGS workbook.
  5: 'Retrieve over broad',
};

function setOfficialText(
  sheet: XLSX.WorkSheet,
  address: string,
  value: string,
  options: { size?: number; wrap?: boolean } = {},
) {
  const cell = sheet[address] || (sheet[address] = { t: 's', v: '' });
  cell.t = 's';
  cell.v = value;
  delete cell.w;
  cell.s = {
    ...(cell.s || {}),
    font: { ...(cell.s?.font || {}), ...(options.size ? { sz: options.size } : {}) },
    alignment: {
      ...(cell.s?.alignment || {}),
      vertical: 'center',
      ...(options.wrap ? { wrapText: true, shrinkToFit: true } : {}),
    },
  };
}

function createOfficialObedienceSheet(
  templateBytes: Uint8Array,
  level: 1 | 2 | 3 | 4 | 5,
  round: DisciplineScoreSheetRound,
  line: DisciplineScoreSheetLine,
  trialName: string,
  date: string,
) {
  const source = XLSX.read(templateBytes, { type: 'array', cellStyles: true });
  const sourceName = OFFICIAL_OBEDIENCE_SHEETS[level];
  const sourceSheet = source.Sheets[sourceName];
  if (!sourceSheet) throw new Error(`Official Obedience Level ${level} sheet is unavailable.`);
  const sheet = structuredClone(sourceSheet) as XLSX.WorkSheet;
  const usedRange = XLSX.utils.decode_range(sheet['!ref'] || 'A1:H1');
  // Legacy .xls templates can carry formatting metadata for all 256 rows and
  // columns. Trim it to the actual official form so spreadsheet renderers and
  // print previews do not treat the unused grid as part of the score sheet.
  if (sheet['!rows']) sheet['!rows'] = sheet['!rows'].slice(0, usedRange.e.r + 1);
  if (sheet['!cols']) sheet['!cols'] = sheet['!cols'].slice(0, usedRange.e.c + 1);
  for (const key of Object.keys(sheet)) {
    if (key.startsWith('!') || !/^[A-Z]+\d+$/.test(key)) continue;
    const cell = XLSX.utils.decode_cell(key);
    if (cell.r > usedRange.e.r || cell.c > usedRange.e.c) delete sheet[key];
  }
  const dogLabel = `${line.dog || ''}${line.entryType === 'feo' ? ' (FEO)' : ''}`.trim();
  const registration = line.registration || 'Pending';
  const division = line.division?.trim() || '—';

  setOfficialText(sheet, 'A1', `A   B   Jr   Placing     Run: ${line.runningPosition ?? '—'}`, { size: 10 });
  setOfficialText(sheet, 'A2', `Date: ${date}`, { size: 10 });
  setOfficialText(sheet, 'A3', `Judge: ${round.judge_name || 'TBA'}`, { size: 10, wrap: true });
  setOfficialText(sheet, 'D1', `C-WAGS\n${trialName}`, { size: 9, wrap: true });
  setOfficialText(sheet, 'D2', `Level ${level} · Round ${round.round_number || 1}`, { size: 10, wrap: true });
  setOfficialText(sheet, 'D3', `A   B   TO   Jr · Selected: ${division}`, { size: 9, wrap: true });
  if (level === 5) {
    setOfficialText(sheet, 'F1', `Name: ${dogLabel}`, { size: 9, wrap: true });
    setOfficialText(sheet, 'F2', `C-WAGS #: ${registration}`, { size: 9, wrap: true });
    setOfficialText(
      sheet,
      'F3',
      `Breed: ${line.breed || '—'} · Handler: ${line.handler || '—'}`,
      { size: 8, wrap: true },
    );
  } else {
    setOfficialText(sheet, 'F1', `Number / Name:\n${registration} / ${dogLabel}`, { size: 8, wrap: true });
    setOfficialText(sheet, 'F2', `Breed: ${line.breed || '—'}`, { size: 9, wrap: true });
    setOfficialText(sheet, 'F3', `Handler: ${line.handler || '—'}`, { size: 9, wrap: true });
  }
  sheet['!rows'] ||= [];
  sheet['!rows'][0] = { ...(sheet['!rows'][0] || {}), hpt: Math.max(sheet['!rows'][0]?.hpt || 0, 32) };
  sheet['!rows'][1] = { ...(sheet['!rows'][1] || {}), hpt: Math.max(sheet['!rows'][1]?.hpt || 0, 24) };
  sheet['!rows'][2] = { ...(sheet['!rows'][2] || {}), hpt: Math.max(sheet['!rows'][2]?.hpt || 0, 24) };
  return sheet;
}

const applyCellStyle = (
  sheet: XLSX.WorkSheet,
  address: string,
  options: { bold?: boolean; fill?: string; size?: number; align?: 'left' | 'center' } = {},
) => {
  const cell = sheet[address] || (sheet[address] = { t: 's', v: '' });
  cell.s = {
    font: { name: 'Calibri', sz: options.size || 10, bold: options.bold || false },
    alignment: {
      vertical: 'center', horizontal: options.align || 'left', wrapText: true,
    },
    fill: { fgColor: { rgb: options.fill || 'FFFFFF' } },
    border: Object.fromEntries(
      ['top', 'bottom', 'left', 'right'].map((side) => [
        side, { style: 'thin', color: { rgb: '777777' } },
      ]),
    ),
  };
};

function addObedienceCard(
  data: (string | number)[][], start: number, round: DisciplineScoreSheetRound,
  line: DisciplineScoreSheetLine, trialName: string, date: string,
) {
  const level = levelFromClassName(round.class_name);
  const exercises = OBEDIENCE_EXERCISES[level] || OBEDIENCE_EXERCISES[1];
  data[start][0] = `${round.class_name} — Participant Score Card (Beta)`;
  data[start + 1][0] = `Trial: ${trialName}`; data[start + 1][5] = `Date: ${date}`;
  data[start + 2][0] = `Dog: ${line.dog}${line.entryType === 'feo' ? ' (FEO)' : ''}`;
  data[start + 2][4] = `Handler: ${line.handler}`;
  data[start + 3][0] = `C-WAGS #: ${line.registration}`;
  data[start + 3][4] = `Division: ${line.division || '—'}`;
  data[start + 3][7] = `Run: ${line.runningPosition ?? '—'}`;
  data[start + 4][0] = `Round ${round.round_number || 1} · Judge: ${round.judge_name || 'TBA'}`;
  data[start + 5] = [
    'Exercise', '', 'Non-Qualifying', 'Major\n4+ points', 'Minor\n2–3 points',
    'Slight\n½–1 point', 'Maximum', 'Points Lost', 'Net Score', '',
  ];
  exercises.forEach((exercise, index) => {
    const row = start + 6 + index * 2;
    data[row][0] = exercise.name;
    data[row][6] = exercise.points;
  });
  const totalRow = start + 6 + exercises.length * 2;
  data[totalRow][0] = 'OTHER DEDUCTIONS';
  data[totalRow + 1][0] = 'MAXIMUM POINTS';
  data[totalRow + 1][6] = exercises.reduce((sum, exercise) => sum + exercise.points, 0);
  data[totalRow + 2][0] = 'TOTAL NET SCORE';
  data[totalRow + 3][0] = 'Common non-qualifying reasons';
  data[totalRow + 3][2] =
    'Anticipation except finish/heeling/Figure 8 · continuous barking · food used at the wrong time · handler continually adapts pace · no required change of pace · constant tight leash.';
  data[totalRow + 5][0] = 'Result:';
  data[totalRow + 5][2] = 'PASS  /  FAIL  /  FEO';
  data[totalRow + 5][5] = 'Place:';
  data[totalRow + 5][7] = 'Judge initials:';
  return totalRow + 6;
}

function addRallyCard(
  data: (string | number)[][], start: number, round: DisciplineScoreSheetRound,
  line: DisciplineScoreSheetLine, trialName: string, date: string,
) {
  data[start][0] = `${round.class_name} — Participant Score Card (Beta)`;
  data[start + 1][0] = `Trial: ${trialName}`; data[start + 1][5] = `Date: ${date}`;
  data[start + 2][0] = `Dog: ${line.dog}${line.entryType === 'feo' ? ' (FEO)' : ''}`;
  data[start + 2][4] = `Handler: ${line.handler}`;
  data[start + 3][0] = `C-WAGS #: ${line.registration}`;
  data[start + 3][4] = `Division: ${line.division || '—'}`;
  data[start + 3][7] = `Run: ${line.runningPosition ?? '—'}`;
  data[start + 4][0] = `Round ${round.round_number || 1} · Judge: ${round.judge_name || 'TBA'}`;
  data[start + 5] = ['Station', '', 'Deduction', '', 'Reason / Judge Notes', '', '', '', '', ''];
  for (let index = 0; index < 6; index++) data[start + 6 + index][0] = '';
  const totalRow = start + 12;
  data[totalRow][0] = 'Starting Score'; data[totalRow][2] = 100;
  data[totalRow][4] = 'Total Deductions'; data[totalRow][7] = '';
  data[totalRow + 1][0] = 'Course Time'; data[totalRow + 1][2] = '____ : ____ . ____';
  data[totalRow + 1][4] = 'Final Score'; data[totalRow + 1][7] = '';
  data[totalRow + 2][0] = 'Retries:';
  data[totalRow + 2][2] = '____ × 7 points';
  data[totalRow + 2][4] = 'Time faults:';
  data[totalRow + 2][7] = '';
  data[totalRow + 3][0] = 'Judge Notes / NQ reason:';
  data[totalRow + 5][0] = 'Result:'; data[totalRow + 5][2] = 'PASS  /  FAIL  /  FEO';
  data[totalRow + 5][5] = 'Place:'; data[totalRow + 5][7] = 'Judge initials:';
  return totalRow + 6;
}

const isRallyDiscipline = (round: DisciplineScoreSheetRound) => {
  const type = round.class_type.toLowerCase();
  const name = round.class_name.toLowerCase();
  return type === 'rally' || type === 'zoom' || name.includes('rally') || name.includes('zoom');
};

const rallyStationCount = (className: string) => {
  const name = className.toLowerCase();
  if (name.includes('pro') || name.includes('arf')) return 22;
  if (name.includes('advanced')) return 21;
  if (name.includes('starter') || name.includes('zoom')) return 20;
  return 22;
};

function createRallyParticipantSheet(
  round: DisciplineScoreSheetRound,
  line: DisciplineScoreSheetLine,
  trialName: string,
  date: string,
) {
  const stationCount = rallyStationCount(round.class_name);
  const isZoom = round.class_type.toLowerCase() === 'zoom' || round.class_name.toLowerCase().includes('zoom');
  const data: (string | number)[][] = [
    [`${round.class_name} — C-WAGS Rally Judge Score Sheet`],
    [`Trial: ${trialName}`, '', '', '', '', `Date: ${date}`],
    [`Dog: ${line.dog || '—'}${line.entryType === 'feo' ? ' (FEO)' : ''}`, '', '', '', `Handler: ${line.handler || '—'}`],
    [`C-WAGS #: ${line.registration || 'Pending'}`, '', '', '', `Division: ${line.division || '—'}`, '', '', `Run: ${line.runningPosition ?? '—'}`],
    [`Round ${round.round_number || 1} · Judge: ${round.judge_name || 'TBA'}`],
    ['Station', 'Sign / Exercise', '', 'Points Deducted', '', 'Retry', 'Judge Notes', '', '', ''],
  ];
  for (let station = 1; station <= stationCount; station++) {
    data.push([station, '', '', '', '', '☐', '', '', '', '']);
  }
  const summary = data.length;
  data.push(
    ['Starting score', '', 100, '', 'Station / performance deductions', '', '', ''],
    ['Successful retries', '', '____ × 3', '', 'Excess retries', '', '____ × 7', ''],
    ['Other deductions', '', '', '', 'Time penalty', '', '', ''],
    ['Course time', '', '____ : ____ . ____', '', 'Final score', '', '', ''],
    ['Result', '', 'QUALIFYING  /  NQ  /  FEO', '', 'Place', '', '', ''],
    ['NQ reason / final judge notes'],
    ['Judge initials / signature:'],
    [
      isZoom
        ? 'Zoom: standard time 2:00; maximum 3:00. One point per started 10-second interval over standard time.'
        : 'Standard Rally: standard time 3:00; maximum 4:00. One point per started 10-second interval over standard time.',
    ],
    ['A: one retry on two different exercises · B: one retry on one exercise · Jr: three total retries. Successful retry: 3 points; each retry over the division limit: 7 points.'],
    ...(round.class_name.toLowerCase().includes('arf')
      ? [['ARF Freestyle Short: PASS / FAIL   (20 of 30 exercise points required; exercise points are not included in the course score).']]
      : []),
  );
  const sheet = XLSX.utils.aoa_to_sheet(data);
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, { s: { r: 1, c: 5 }, e: { r: 1, c: 9 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }, { s: { r: 2, c: 4 }, e: { r: 2, c: 9 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } }, { s: { r: 3, c: 4 }, e: { r: 3, c: 6 } },
    { s: { r: 3, c: 7 }, e: { r: 3, c: 9 } }, { s: { r: 4, c: 0 }, e: { r: 4, c: 9 } },
    { s: { r: 5, c: 1 }, e: { r: 5, c: 2 } }, { s: { r: 5, c: 3 }, e: { r: 5, c: 4 } },
    { s: { r: 5, c: 6 }, e: { r: 5, c: 9 } },
  ];
  for (let row = 6; row < 6 + stationCount; row++) {
    merges.push(
      { s: { r: row, c: 1 }, e: { r: row, c: 2 } },
      { s: { r: row, c: 3 }, e: { r: row, c: 4 } },
      { s: { r: row, c: 6 }, e: { r: row, c: 9 } },
    );
  }
  for (let row = summary; row <= summary + 4; row++) {
    merges.push(
      { s: { r: row, c: 0 }, e: { r: row, c: 1 } },
      { s: { r: row, c: 2 }, e: { r: row, c: 3 } },
      { s: { r: row, c: 4 }, e: { r: row, c: 5 } },
      { s: { r: row, c: 6 }, e: { r: row, c: 9 } },
    );
  }
  for (let row = summary + 5; row < data.length; row++) {
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 9 } });
  }
  sheet['!merges'] = merges;
  sheet['!cols'] = [9, 14, 10, 12, 8, 9, 14, 10, 10, 10].map((wch) => ({ wch }));
  sheet['!rows'] = data.map((_, row) => ({ hpt: row === 0 ? 27 : row >= 6 && row < summary ? 18 : row === summary + 5 ? 34 : 21 }));
  for (let row = 0; row < data.length; row++) {
    for (let column = 0; column < 10; column++) {
      applyCellStyle(sheet, XLSX.utils.encode_cell({ r: row, c: column }), {
        bold: row <= 5 || (row >= summary && row <= summary + 4),
        fill: row === 0 ? 'FDE9A9' : row === 5 ? 'D9E8F7' : row >= summary && row <= summary + 4 ? 'FFF4CC' : 'FFFFFF',
        size: row === 0 ? 15 : row >= data.length - 3 ? 8 : 10,
        align: row === 0 || row === 5 || column === 0 || column === 5 ? 'center' : 'left',
      });
    }
  }
  return sheet;
}

function createRallyTableSheet(
  round: DisciplineScoreSheetRound,
  lines: DisciplineScoreSheetLine[],
  trialName: string,
  date: string,
) {
  const data: (string | number)[][] = [
    [`${round.class_name} — Rally Table Steward Worksheet`],
    [`Trial: ${trialName}`, '', '', '', '', '', `Date: ${date}`],
    [`Round ${round.round_number || 1} · Judge: ${round.judge_name || 'TBA'}`],
    ['Run', 'Division', 'Handler', 'Dog', 'C-WAGS #', 'Entry', 'Deductions', 'Retries', 'Time', 'Time Penalty', 'Final', 'Q / NQ / FEO', 'Place', 'Verified'],
  ];
  const printableLines = lines.length > 0 ? lines : [{
    selectionId: 'blank', roundId: round.id, handler: '', dog: '', registration: '', runningPosition: null,
  }];
  printableLines.forEach((line) => data.push([
    line.runningPosition ?? '', line.division || '', line.handler, line.dog, line.registration,
    line.entryType?.toUpperCase() || 'REG', '', '', '', '', '', '', '', '☐',
  ]));
  data.push(
    [],
    ['Table checks: final score = 100 − all deductions; confirm retry allowance; apply time penalty; ties are broken by course time; exclude FEO from placements.'],
  );
  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, { s: { r: 1, c: 6 }, e: { r: 1, c: 13 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 13 } },
    { s: { r: data.length - 1, c: 0 }, e: { r: data.length - 1, c: 13 } },
  ];
  sheet['!cols'] = [7, 9, 20, 15, 14, 9, 11, 10, 11, 12, 9, 13, 8, 9].map((wch) => ({ wch }));
  sheet['!rows'] = data.map((_, row) => ({ hpt: row === 0 ? 28 : row === 3 ? 32 : row === data.length - 1 ? 34 : 22 }));
  for (let row = 0; row < data.length; row++) {
    for (let column = 0; column < 14; column++) {
      applyCellStyle(sheet, XLSX.utils.encode_cell({ r: row, c: column }), {
        bold: row <= 3,
        fill: row === 0 ? 'FDE9A9' : row === 3 ? 'D9E8F7' : 'FFFFFF',
        size: row === 0 ? 15 : row === data.length - 1 ? 9 : 10,
        align: row <= 3 || [0, 1, 5, 6, 7, 8, 9, 10, 11, 12, 13].includes(column) ? 'center' : 'left',
      });
    }
  }
  return sheet;
}

function addGamesCard(
  data: (string | number)[][], start: number, round: DisciplineScoreSheetRound,
  line: DisciplineScoreSheetLine, trialName: string, date: string,
) {
  const game = round.games_subclass || '—';
  const gameRules: Record<string, { name: string; time: string; qualifying: string }> = {
    C: { name: 'Colors', time: '2:00', qualifying: '90' },
    P: { name: 'Pairs', time: '2:00', qualifying: '85' },
    T: { name: 'Team', time: '3:00', qualifying: '80' },
    BJ: { name: 'Black Jack', time: '2:00', qualifying: '45' },
    GB: { name: 'Grab Bag', time: 'See current rules', qualifying: 'See current rules' },
  };
  const rule = gameRules[game] || { name: game, time: 'See current rules', qualifying: 'See current rules' };
  data[start][0] = `${round.class_name} — Participant / Team Score Card (Beta)`;
  data[start + 1][0] = `Trial: ${trialName}`; data[start + 1][5] = `Date: ${date}`;
  data[start + 2][0] = `Dog: ${line.dog}${line.entryType === 'feo' ? ' (FEO)' : ''}`;
  data[start + 2][4] = `Handler: ${line.handler}`;
  data[start + 3][0] = `C-WAGS #: ${line.registration}`;
  data[start + 3][4] = `Division: ${line.division || '—'}`;
  data[start + 3][7] = `Run: ${line.runningPosition ?? '—'}`;
  data[start + 4][0] = `Round ${round.round_number || 1} · Judge: ${round.judge_name || 'TBA'}`;
  data[start + 5][0] = `Game: ${rule.name} (${game})`;
  data[start + 5][4] = `Time limit: ${rule.time}`;
  data[start + 5][7] = `Minimum Q: ${rule.qualifying}`;
  data[start + 6][0] = game === 'P' || game === 'T' ? 'Partner / Team Dogs:' : 'Additional dog information:';
  data[start + 8][0] = 'Points / Hands / Game Requirements Completed:';
  data[start + 10][0] = 'Time:'; data[start + 10][3] = '____ : ____ . ____';
  data[start + 10][5] = 'Result:'; data[start + 10][7] = `${game || 'PASS'}  /  FAIL  /  FEO`;
  data[start + 11][0] = 'Judge Notes / NQ reason:';
  data[start + 14][0] = 'Place (optional):'; data[start + 14][5] = 'Judge initials:';
  data[start + 15][0] =
    game === 'P' || game === 'T'
      ? 'Use one shared card for the pair/team. Record each dog separately on final trial results.'
      : 'Record points, time, and any NQ reason clearly.';
  return start + 16;
}

function addCardMerges(
  merges: XLSX.Range[], range: CardRange,
) {
  const { start, discipline, exerciseCount } = range;
  const merge = (r1: number, c1: number, r2: number, c2: number) =>
    merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
  merge(start, 0, start, 9);
  merge(start + 1, 0, start + 1, 4); merge(start + 1, 5, start + 1, 9);
  merge(start + 2, 0, start + 2, 3); merge(start + 2, 4, start + 2, 9);
  merge(start + 3, 0, start + 3, 3); merge(start + 3, 4, start + 3, 6); merge(start + 3, 7, start + 3, 9);
  merge(start + 4, 0, start + 4, 9);

  if (discipline === 'obedience') {
    merge(start + 5, 0, start + 5, 1); merge(start + 5, 8, start + 5, 9);
    for (let index = 0; index < exerciseCount; index++) {
      const row = start + 6 + index * 2;
      merge(row, 0, row + 1, 1);
      merge(row, 6, row + 1, 6);
      merge(row, 7, row + 1, 7);
      merge(row, 8, row + 1, 9);
    }
    const totalRow = start + 6 + exerciseCount * 2;
    merge(totalRow, 0, totalRow, 5); merge(totalRow, 8, totalRow, 9);
    merge(totalRow + 1, 0, totalRow + 1, 5); merge(totalRow + 1, 8, totalRow + 1, 9);
    merge(totalRow + 2, 0, totalRow + 2, 7); merge(totalRow + 2, 8, totalRow + 2, 9);
    merge(totalRow + 3, 0, totalRow + 3, 1); merge(totalRow + 3, 2, totalRow + 4, 9);
    merge(totalRow + 5, 0, totalRow + 5, 1); merge(totalRow + 5, 2, totalRow + 5, 4);
    merge(totalRow + 5, 5, totalRow + 5, 6); merge(totalRow + 5, 7, totalRow + 5, 9);
    return;
  }

  if (discipline === 'rally') {
    merge(start + 5, 0, start + 5, 1); merge(start + 5, 2, start + 5, 3); merge(start + 5, 4, start + 5, 9);
    for (let row = start + 6; row <= start + 11; row++) {
      merge(row, 0, row, 1); merge(row, 2, row, 3); merge(row, 4, row, 9);
    }
    merge(start + 12, 0, start + 12, 1); merge(start + 12, 2, start + 12, 3);
    merge(start + 12, 4, start + 12, 6); merge(start + 12, 7, start + 12, 9);
    merge(start + 13, 0, start + 13, 1); merge(start + 13, 2, start + 13, 3);
    merge(start + 13, 4, start + 13, 6); merge(start + 13, 7, start + 13, 9);
    merge(start + 14, 0, start + 14, 1); merge(start + 14, 2, start + 14, 3);
    merge(start + 14, 4, start + 14, 6); merge(start + 14, 7, start + 14, 9);
    merge(start + 15, 0, start + 16, 9);
    merge(start + 17, 0, start + 17, 1); merge(start + 17, 2, start + 17, 4);
    merge(start + 17, 5, start + 17, 6); merge(start + 17, 7, start + 17, 9);
    return;
  }

  merge(start + 5, 0, start + 5, 3); merge(start + 5, 4, start + 5, 6); merge(start + 5, 7, start + 5, 9);
  merge(start + 6, 0, start + 7, 9);
  merge(start + 8, 0, start + 9, 9);
  merge(start + 10, 0, start + 10, 2); merge(start + 10, 3, start + 10, 4);
  merge(start + 10, 5, start + 10, 6); merge(start + 10, 7, start + 10, 9);
  merge(start + 11, 0, start + 13, 9);
  merge(start + 14, 0, start + 14, 4); merge(start + 14, 5, start + 14, 9);
  merge(start + 15, 0, start + 15, 9);
}

function addRallyGamesReferenceSheet(workbook: XLSX.WorkBook) {
  const data = [
    ['C-WAGS Rally and Games Judge Reference'],
    ['Rally course-time penalties'],
    ['Standard classes', 'Penalty', '', 'Zoom classes', 'Penalty'],
    ['3:00.01–3:10.00', 1, '', '2:00.01–2:10.00', 1],
    ['3:10.01–3:20.00', 2, '', '2:10.01–2:20.00', 2],
    ['3:20.01–3:30.00', 3, '', '2:20.01–2:30.00', 3],
    ['3:30.01–3:40.00', 4, '', '2:30.01–2:40.00', 4],
    ['3:40.01–3:50.00', 5, '', '2:40.01–2:50.00', 5],
    ['3:50.01–4:00.00', 6, '', '2:50.01–3:00.00', 6],
    ['4:00.01 or higher', 'NQ', '', '3:00.01 or higher', 'NQ'],
    [],
    ['Retry penalty', '7 points for each retry over the division limit'],
    ['Division limits', 'A: two different exercises, once each · B: one exercise, once · JH: three total retries'],
    ['Placement ties', 'Course time breaks tied scores in all divisions'],
    [],
    ['Games', 'Time limit', '', 'Minimum qualifying score', ''],
    ['Colors', '2:00', '', 90, ''],
    ['Pairs', '2:00', '', 85, ''],
    ['Team', '3:00', '', 80, ''],
    ['Black Jack', '2:00', '', 45, ''],
    ['Grab Bag', 'Use the current C-WAGS rules', '', 'Use the current C-WAGS rules', ''],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 11, c: 1 }, e: { r: 11, c: 4 } },
    { s: { r: 12, c: 1 }, e: { r: 12, c: 4 } },
    { s: { r: 13, c: 1 }, e: { r: 13, c: 4 } },
    ...Array.from({ length: 6 }, (_, index) => ({
      s: { r: 15 + index, c: 3 },
      e: { r: 15 + index, c: 4 },
    })),
  ];
  sheet['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 5 }, { wch: 28 }, { wch: 20 }];
  sheet['!rows'] = data.map((_, row) => ({ hpt: row === 0 ? 28 : row === 12 ? 34 : row === 15 ? 30 : 22 }));
  for (let row = 0; row < data.length; row++) {
    for (let column = 0; column < 5; column++) {
      applyCellStyle(sheet, XLSX.utils.encode_cell({ r: row, c: column }), {
        bold: [0, 1, 2, 15].includes(row),
        fill: row === 0 ? 'FDE9A9' : [2, 15].includes(row) ? 'D9E8F7' : 'FFFFFF',
        size: row === 0 ? 15 : 11,
        align: [0, 1, 2, 15].includes(row) ? 'center' : 'left',
      });
    }
  }
  XLSX.utils.book_append_sheet(workbook, sheet, 'Judge Reference');
}

function addRallyHostChecklistSheet(workbook: XLSX.WorkBook) {
  const data = [
    ['C-WAGS Rally Trial — Host and Table Checklist'],
    ['Before the trial'],
    ['☐', 'Confirm ring size and safe footing/fencing for the scheduled Rally classes.'],
    ['☐', 'Confirm judge, class/round schedule, divisions, entries, FEO entries, jump heights, and saved running order.'],
    ['☐', 'Prepare the course map, signs and holders, required obstacles, participant score sheets, table worksheet, stopwatch plus spare, calculator, pens, clipboards, and posting supplies.'],
    ['☐', 'Print one participant score sheet per run plus spares; print one table-steward worksheet per class and round.'],
    ['Class preparation'],
    ['☐', 'Make the course map available before the walkthrough.'],
    ['☐', 'The judge briefs the class and provides at least a 10-minute walkthrough.'],
    ['☐', 'Run dogs in the scheduled order; resolve handler conflicts before the class begins.'],
    ['During each run'],
    ['☐', 'Timer starts when the team crosses START and stops when the team crosses FINISH.'],
    ['☐', 'Judge records deductions and retries by station, course time, any time penalty, final score, result, and NQ reason.'],
    ['☐', 'FEO runs are marked clearly; their scores are not recorded and they are excluded from placements.'],
    ['Table reconciliation'],
    ['☐', 'Check division retry allowance, successful-retry deductions, excess-retry deductions, course-time penalty, arithmetic, and qualifying status.'],
    ['☐', 'Transfer final score and time to the table worksheet. Break tied scores by course time.'],
    ['☐', 'Determine placements separately by division and exclude Training Only/FEO as required.'],
    ['After the class'],
    ['☐', 'Have the judge/table verify results before posting or entering them in the trial system.'],
    ['☐', 'Retain the participant score sheets and reconciled table worksheet with the trial paperwork.'],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
    ...[1, 6, 10, 14, 18].map((row) => ({ s: { r: row, c: 0 }, e: { r: row, c: 7 } })),
  ];
  sheet['!cols'] = [{ wch: 5 }, { wch: 105 }, ...Array.from({ length: 6 }, () => ({ wch: 3 }))];
  sheet['!rows'] = data.map((_, row) => ({ hpt: row === 0 ? 30 : [1, 6, 10, 14, 18].includes(row) ? 25 : 36 }));
  for (let row = 0; row < data.length; row++) {
    for (let column = 0; column < 8; column++) {
      applyCellStyle(sheet, XLSX.utils.encode_cell({ r: row, c: column }), {
        bold: row === 0 || [1, 6, 10, 14, 18].includes(row),
        fill: row === 0 ? 'FDE9A9' : [1, 6, 10, 14, 18].includes(row) ? 'D9E8F7' : 'FFFFFF',
        size: row === 0 ? 15 : 10,
        align: row === 0 || [1, 6, 10, 14, 18].includes(row) || column === 0 ? 'center' : 'left',
      });
    }
  }
  XLSX.utils.book_append_sheet(workbook, sheet, 'Rally Host Checklist');
}

export function createDisciplineScoreSheetWorkbook(
  rounds: DisciplineScoreSheetRound[], lines: DisciplineScoreSheetLine[],
  trialName: string, date: string, obedienceTemplates: OfficialObedienceTemplates = {},
): Uint8Array {
  const workbook = XLSX.utils.book_new();
  const nonScentRounds = rounds.filter((round) => round.class_type.toLowerCase() !== 'scent');
  for (const round of nonScentRounds) {
    const discipline = round.class_type.toLowerCase();
    const level = discipline === 'obedience' ? levelFromClassName(round.class_name) : 0;
    const cardsPerPage = 1;
    const roundLines = lines.filter((line) => line.roundId === round.id).sort(
      (left, right) =>
        (left.runningPosition ?? Number.MAX_SAFE_INTEGER) -
          (right.runningPosition ?? Number.MAX_SAFE_INTEGER) ||
        left.handler.localeCompare(right.handler) || left.dog.localeCompare(right.dog),
    );
    if (isRallyDiscipline(round)) {
      XLSX.utils.book_append_sheet(
        workbook,
        createRallyTableSheet(round, roundLines, trialName, date),
        safeSheetName(round.class_name, ` R${round.round_number || 1} Table`),
      );
      const participantLines = roundLines.length > 0 ? roundLines : [{
        selectionId: 'blank', roundId: round.id, handler: '', dog: '', registration: '', runningPosition: null,
      }];
      participantLines.forEach((line, page) => {
        XLSX.utils.book_append_sheet(
          workbook,
          createRallyParticipantSheet(round, line, trialName, date),
          safeSheetName(round.class_name, ` R${round.round_number || 1} P${page + 1}`),
        );
      });
      continue;
    }
    if (discipline === 'obedience' && obedienceTemplates[level as 1 | 2 | 3 | 4 | 5]) {
      const template = obedienceTemplates[level as 1 | 2 | 3 | 4 | 5]!;
      const officialLines = roundLines.length > 0 ? roundLines : [{
        selectionId: 'blank', roundId: round.id, handler: '', dog: '',
        registration: '', runningPosition: null,
      }];
      officialLines.forEach((line, page) => {
        const sheet = createOfficialObedienceSheet(
          template,
          level as 1 | 2 | 3 | 4 | 5,
          round,
          line,
          trialName,
          date,
        );
        const suffix = ` R${round.round_number || 1} P${page + 1}`;
        XLSX.utils.book_append_sheet(workbook, sheet, safeSheetName(round.class_name, suffix));
      });
      continue;
    }
    const pageCount = Math.max(1, Math.ceil(roundLines.length / cardsPerPage));
    for (let page = 0; page < pageCount; page++) {
      const pageLines = roundLines.slice(page * cardsPerPage, page * cardsPerPage + cardsPerPage);
      const data: (string | number)[][] = Array.from({ length: 72 }, () => Array(10).fill(''));
      const ranges: CardRange[] = [];
      let nextRow = 0;
      for (let slot = 0; slot < cardsPerPage; slot++) {
        const line: DisciplineScoreSheetLine = pageLines[slot] || {
          selectionId: `blank-${slot}`, roundId: round.id,
          handler: '', dog: '', registration: '', runningPosition: null,
        };
        const start = nextRow;
        if (discipline === 'obedience') nextRow = addObedienceCard(data, start, round, line, trialName, date);
        else if (discipline === 'rally') nextRow = addRallyCard(data, start, round, line, trialName, date);
        else nextRow = addGamesCard(data, start, round, line, trialName, date);
        ranges.push({ start, end: nextRow - 1, discipline, exerciseCount: level ? (OBEDIENCE_EXERCISES[level]?.length || 0) : 0 });
        nextRow += 2;
      }
      const usedData = data.slice(0, nextRow - 2);
      const sheet = XLSX.utils.aoa_to_sheet(usedData);
      const merges: XLSX.Range[] = [];
      for (const range of ranges) addCardMerges(merges, range);
      sheet['!merges'] = merges;
      sheet['!cols'] = [24, 8, 15, 10, 18, 12, 12, 12, 12, 12].map((wch) => ({ wch }));
      sheet['!rows'] = usedData.map((_, row) => {
        const card = ranges.find((range) => row >= range.start && row <= range.end);
        const relative = card ? row - card.start : -1;
        const isObedienceExercise = card?.discipline === 'obedience' && relative >= 6 && relative < 6 + card.exerciseCount * 2;
        // Obedience levels contain between six and ten exercises. Give shorter
        // levels taller writing boxes so their one-participant card fills the
        // printed page, while keeping longer levels on one Letter sheet.
        const obedienceExerciseHeight = card?.discipline === 'obedience'
          ? Math.max(23, Math.min(34, Math.floor(400 / Math.max(1, card.exerciseCount * 2))))
          : 23;
        return {
          hpt: relative === 0
            ? 26
            : isObedienceExercise
              ? obedienceExerciseHeight
              : [15, 16].includes(relative)
                ? 28
                : 20,
        };
      });
      for (let row = 0; row < usedData.length; row++) {
        const card = ranges.find((range) => row >= range.start && row <= range.end);
        const relative = card ? row - card.start : -1;
        for (let column = 0; column < 10; column++) {
          const fill = relative === 0 ? 'FDE9A9' : relative === 5 ? 'D9E8F7' : 'FFFFFF';
          applyCellStyle(sheet, XLSX.utils.encode_cell({ r: row, c: column }), {
            bold: relative >= 0 && relative <= 5, fill,
            size: relative === 0 ? 15 : 10,
            align: relative === 0 || relative === 5 ? 'center' : 'left',
          });
        }
      }
      const suffix = ` R${round.round_number || 1} P${page + 1}`;
      XLSX.utils.book_append_sheet(workbook, sheet, safeSheetName(round.class_name, suffix));
    }
  }
  if (nonScentRounds.some(isRallyDiscipline)) addRallyHostChecklistSheet(workbook);
  if (nonScentRounds.some((round) => isRallyDiscipline(round) || round.class_type.toLowerCase() === 'games')) {
    addRallyGamesReferenceSheet(workbook);
  }
  const bytes = new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
  const zip = unzipSync(bytes);
  for (const path of Object.keys(zip).filter((item) => /^xl\/worksheets\/sheet\d+\.xml$/.test(item))) {
    let xml = strFromU8(zip[path]);
    const sheetIndex = Number(path.match(/sheet(\d+)\.xml$/)?.[1] || 1) - 1;
    const sheetName = workbook.SheetNames[sheetIndex] || '';
    const isTableSheet = sheetName.endsWith(' Table');
    if (!xml.includes('<sheetPr')) {
      xml = xml.replace('<dimension', '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension');
    }
    const marker = ['<ignoredErrors', '<drawing', '<legacyDrawing', '<tableParts', '<extLst']
      .find((item) => xml.includes(item)) || '</worksheet>';
    const printSettings = [
      xml.includes('<printOptions') ? '' : '<printOptions horizontalCentered="1"/>',
      xml.includes('<pageMargins')
        ? ''
        : '<pageMargins left="0.3" right="0.3" top="0.3" bottom="0.3" header="0.15" footer="0.15"/>',
      xml.includes('<pageSetup')
        ? ''
        : `<pageSetup fitToWidth="1" fitToHeight="${isTableSheet ? 0 : 1}" orientation="${isTableSheet ? 'landscape' : 'portrait'}" paperSize="1"/>`,
    ].join('');
    if (printSettings) xml = xml.replace(marker, printSettings + marker);
    zip[path] = strToU8(xml);
  }
  return zipSync(zip);
}
