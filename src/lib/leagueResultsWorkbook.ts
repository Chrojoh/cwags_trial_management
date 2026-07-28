import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

export interface LeagueWorkbookRound {
  judgeInfo: string;
  trialDate: string;
  roundNumber: number;
  results: Map<string, string>;
}

export interface LeagueWorkbookClass {
  className: string;
  participants: Array<{
    cwagsNumber: string;
    dogName: string;
    handlerName: string;
  }>;
  rounds: LeagueWorkbookRound[];
}

export interface LeagueWorkbookTrial {
  trialName: string;
  clubName: string;
  location: string;
  startDate: string;
  endDate: string;
}

const spreadsheetNamespace = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const relationshipsNamespace =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const packageRelationshipsNamespace =
  'http://schemas.openxmlformats.org/package/2006/relationships';

const recapClassNames = [
  'Patrol 1',
  'Detective 2',
  'Investigator 3',
  'Super Sleuth 4',
  'Private Inv',
  'Det Diversions',
  'Ranger 1',
  'Ranger 2',
  'Ranger 3',
  'Ranger 4',
  'Ranger 5',
  'Dasher 3',
  'Dasher 4',
  'Dasher 5',
  'Dasher 6',
  'Obedience 1',
  'Obedience 2',
  'Obedience 3',
  'Obedience 4',
  'Obedience 5',
  'Starter',
  'Advanced',
  'Pro',
  'ARF',
  'Zoom 1',
  'Zoom 1.5',
  'Zoom 2',
  'Games 1',
  'Games 2',
  'Games 3',
  'Games 4',
] as const;

const parseXml = (xml: string): XMLDocument => {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const parseError = document.querySelector('parsererror');
  if (parseError) throw new Error(`Invalid workbook template XML: ${parseError.textContent}`);
  return document;
};

const serializeXml = (document: XMLDocument): string =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${new XMLSerializer().serializeToString(document.documentElement)}`;

const columnName = (index: number): string => {
  let value = index + 1;
  let name = '';
  while (value > 0) {
    value--;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
};

const quoteSheetName = (name: string): string => `'${name.replace(/'/g, "''")}'`;

const safeSheetName = (requested: string, used: Set<string>): string => {
  const base = (requested.replace(/[:\\/?*[\]]/g, '').trim() || 'Class').slice(0, 31);
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffixText = ` ${suffix++}`;
    candidate = `${base.slice(0, 31 - suffixText.length)}${suffixText}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
};

const displayDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${year}`;
};

const displayShortDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${String(year).slice(-2)}`;
};

const normalizedRecapName = (className: string): string => {
  const aliases: Record<string, string> = {
    'Super Sleuth': 'Super Sleuth 4',
    'Detective Diversions': 'Det Diversions',
    'Private Investigator': 'Private Inv',
  };
  return aliases[className] || className;
};

const splitLocation = (location: string): { city: string; province: string } => {
  const parts = location.split(',').map((part) => part.trim()).filter(Boolean);
  return { city: parts[0] || location, province: parts[1] || '' };
};

const getOrCreateRow = (document: XMLDocument, rowNumber: number): Element => {
  const sheetData = document.getElementsByTagNameNS(spreadsheetNamespace, 'sheetData')[0];
  let row = Array.from(sheetData.getElementsByTagNameNS(spreadsheetNamespace, 'row')).find(
    (candidate) => candidate.getAttribute('r') === String(rowNumber)
  );
  if (row) return row;

  row = document.createElementNS(spreadsheetNamespace, 'row');
  row.setAttribute('r', String(rowNumber));
  row.setAttribute('spans', '1:9');
  const laterRow = Array.from(sheetData.children).find(
    (candidate) => Number(candidate.getAttribute('r')) > rowNumber
  );
  sheetData.insertBefore(row, laterRow || null);
  return row;
};

const getOrCreateCell = (
  document: XMLDocument,
  address: string,
  styleSourceAddress?: string
): Element => {
  const rowNumber = Number(address.match(/\d+$/)?.[0]);
  const row = getOrCreateRow(document, rowNumber);
  let cell = Array.from(row.getElementsByTagNameNS(spreadsheetNamespace, 'c')).find(
    (candidate) => candidate.getAttribute('r') === address
  );
  if (cell) return cell;

  cell = document.createElementNS(spreadsheetNamespace, 'c');
  cell.setAttribute('r', address);
  if (styleSourceAddress) {
    const styleSource = Array.from(
      document.getElementsByTagNameNS(spreadsheetNamespace, 'c')
    ).find((candidate) => candidate.getAttribute('r') === styleSourceAddress);
    const style = styleSource?.getAttribute('s');
    if (style) cell.setAttribute('s', style);
  }
  row.appendChild(cell);
  return cell;
};

const setCell = (
  document: XMLDocument,
  address: string,
  value: string | number | null,
  styleSourceAddress?: string
): void => {
  const cell = getOrCreateCell(document, address, styleSourceAddress);
  while (cell.firstChild) cell.removeChild(cell.firstChild);

  if (value === null || value === '') {
    cell.removeAttribute('t');
    return;
  }
  if (typeof value === 'number') {
    cell.removeAttribute('t');
    const valueNode = document.createElementNS(spreadsheetNamespace, 'v');
    valueNode.textContent = String(value);
    cell.appendChild(valueNode);
    return;
  }

  cell.setAttribute('t', 'inlineStr');
  const inlineString = document.createElementNS(spreadsheetNamespace, 'is');
  const text = document.createElementNS(spreadsheetNamespace, 't');
  if (/^\s|\s$|\n/.test(value)) text.setAttribute('xml:space', 'preserve');
  text.textContent = value;
  inlineString.appendChild(text);
  cell.appendChild(inlineString);
};

const setFormula = (document: XMLDocument, address: string, formula: string): void => {
  const cell = getOrCreateCell(document, address);
  while (cell.firstChild) cell.removeChild(cell.firstChild);
  cell.removeAttribute('t');
  const formulaNode = document.createElementNS(spreadsheetNamespace, 'f');
  formulaNode.textContent = formula;
  cell.appendChild(formulaNode);
  const valueNode = document.createElementNS(spreadsheetNamespace, 'v');
  valueNode.textContent = '0';
  cell.appendChild(valueNode);
};

const updateDimensionAndColumns = (
  document: XMLDocument,
  lastColumnIndex: number,
  lastRow: number
): void => {
  const lastColumn = columnName(lastColumnIndex);
  const dimension = document.getElementsByTagNameNS(spreadsheetNamespace, 'dimension')[0];
  dimension?.setAttribute('ref', `A1:${lastColumn}${Math.max(98, lastRow)}`);

  const columns = document.getElementsByTagNameNS(spreadsheetNamespace, 'cols')[0];
  const resultColumns = columns
    ? Array.from(columns.getElementsByTagNameNS(spreadsheetNamespace, 'col')).find(
        (column) => column.getAttribute('min') === '4'
      )
    : undefined;
  if (resultColumns && lastColumnIndex + 1 > 9) {
    resultColumns.setAttribute('max', String(lastColumnIndex + 1));
  }
};

const populateClassSheet = (
  sourceXml: string,
  trial: LeagueWorkbookTrial,
  classData: LeagueWorkbookClass
): string => {
  const document = parseXml(sourceXml);
  const rounds = classData.rounds.filter((round) =>
    Array.from(round.results.values()).some((result) => result !== '-')
  );
  const participants = [...classData.participants].sort((a, b) =>
    a.cwagsNumber.localeCompare(b.cwagsNumber, undefined, { numeric: true })
  );

  setCell(
    document,
    'G1',
    `Trial Dates: ${displayShortDate(trial.startDate)} to ${displayShortDate(trial.endDate)}`
  );
  setCell(document, 'F3', normalizedRecapName(classData.className));
  setCell(document, 'B5', trial.clubName);

  const lastResultColumn = Math.max(8, 2 + rounds.length);
  for (let columnIndex = 3; columnIndex <= lastResultColumn; columnIndex++) {
    const column = columnName(columnIndex);
    const round = rounds[columnIndex - 3];
    setCell(document, `${column}5`, round?.judgeInfo || '', 'I5');
    setCell(document, `${column}6`, round ? displayDate(round.trialDate) : '', 'I6');
  }

  for (let rowNumber = 7; rowNumber <= Math.max(98, 6 + participants.length); rowNumber++) {
    const participant = participants[rowNumber - 7];
    const registrationDigits = participant?.cwagsNumber.replace(/\D/g, '') || '';
    const registrationValue = /^\d{8}$/.test(registrationDigits)
      ? Number(registrationDigits)
      : participant?.cwagsNumber || '';
    setCell(document, `A${rowNumber}`, registrationValue, 'A98');
    setCell(document, `B${rowNumber}`, participant?.dogName || '', 'B98');
    setCell(document, `C${rowNumber}`, participant?.handlerName || '', 'C98');
    for (let columnIndex = 3; columnIndex <= lastResultColumn; columnIndex++) {
      const column = columnName(columnIndex);
      const round = rounds[columnIndex - 3];
      const result = participant && round ? round.results.get(participant.cwagsNumber) || '-' : '';
      setCell(document, `${column}${rowNumber}`, result, `I${Math.min(rowNumber, 98)}`);
    }
  }

  updateDimensionAndColumns(document, lastResultColumn, 6 + participants.length);
  return serializeXml(document);
};

const resultCounts = (classData: LeagueWorkbookClass) => {
  let passes = 0;
  let fails = 0;
  let absences = 0;
  classData.rounds.forEach((round) => {
    round.results.forEach((result) => {
      if (result === 'Pass' || ['GB', 'BJ', 'C', 'T', 'P'].includes(result)) passes++;
      else if (result === 'F' || result === 'NQ') fails++;
      else if (result.toLowerCase() === 'abs') absences++;
      else if (result !== '-' && !Number.isNaN(Number(result))) passes++;
    });
  });
  return { passes, fails, absences, total: passes + fails + absences };
};

const populateRecapSheet = (
  sourceXml: string,
  trial: LeagueWorkbookTrial,
  classes: LeagueWorkbookClass[]
): string => {
  const document = parseXml(sourceXml);
  const { city, province } = splitLocation(trial.location);
  setCell(
    document,
    'B3',
    `${displayShortDate(trial.startDate)} to ${displayShortDate(trial.endDate)}`
  );
  setCell(document, 'B4', trial.clubName);
  setCell(document, 'B5', city);
  setCell(document, 'B6', province);

  const byName = new Map(
    classes.map((classData) => [normalizedRecapName(classData.className).toLowerCase(), classData])
  );
  recapClassNames.forEach((className, index) => {
    const row = index + 2;
    const classData = byName.get(className.toLowerCase());
    const counts = classData ? resultCounts(classData) : { passes: 0, fails: 0, absences: 0, total: 0 };
    setCell(document, `E${row}`, counts.passes);
    setCell(document, `F${row}`, counts.fails);
    setCell(document, `G${row}`, counts.absences);
    setCell(document, `H${row}`, counts.total);
  });
  setFormula(document, 'F34', 'SUM(H2:H32)');
  setFormula(document, 'F37', 'F36*F34');
  return serializeXml(document);
};

const setRecapRunFeeFontSize = (stylesXml: string): string => {
  const document = parseXml(stylesXml);
  const cellFormats = document.getElementsByTagNameNS(spreadsheetNamespace, 'cellXfs')[0];
  const runFeeFormat = cellFormats?.getElementsByTagNameNS(spreadsheetNamespace, 'xf')[100];
  if (!runFeeFormat) return stylesXml;

  // Font 2 in the supplied template is its standard 12-point Aptos Narrow font.
  runFeeFormat.setAttribute('fontId', '2');
  runFeeFormat.setAttribute('applyFont', '1');
  const alignment = runFeeFormat.getElementsByTagNameNS(spreadsheetNamespace, 'alignment')[0];
  alignment?.removeAttribute('shrinkToFit');
  return serializeXml(document);
};

const updateWorkbookDefinition = (
  workbookXml: string,
  relationshipXml: string,
  contentTypesXml: string,
  sheetNames: string[],
  classPrintAreas: string[]
): { workbookXml: string; relationshipXml: string; contentTypesXml: string } => {
  const workbookDocument = parseXml(workbookXml);
  const sheets = workbookDocument.getElementsByTagNameNS(spreadsheetNamespace, 'sheets')[0];
  while (sheets.firstChild) sheets.removeChild(sheets.firstChild);
  sheetNames.forEach((name, index) => {
    const sheet = workbookDocument.createElementNS(spreadsheetNamespace, 'sheet');
    sheet.setAttribute('name', name);
    sheet.setAttribute('sheetId', String(index + 1));
    sheet.setAttributeNS(relationshipsNamespace, 'r:id', `rId${1000 + index}`);
    sheets.appendChild(sheet);
  });

  const definedNames = workbookDocument.getElementsByTagNameNS(spreadsheetNamespace, 'definedNames')[0];
  if (definedNames) while (definedNames.firstChild) definedNames.removeChild(definedNames.firstChild);
  const namesContainer = definedNames || workbookDocument.createElementNS(spreadsheetNamespace, 'definedNames');
  if (!definedNames) {
    const calcPr = workbookDocument.getElementsByTagNameNS(spreadsheetNamespace, 'calcPr')[0];
    workbookDocument.documentElement.insertBefore(namesContainer, calcPr || null);
  }
  sheetNames.slice(2).forEach((name, classIndex) => {
    const localSheetId = classIndex + 2;
    const printArea = workbookDocument.createElementNS(spreadsheetNamespace, 'definedName');
    printArea.setAttribute('name', '_xlnm.Print_Area');
    printArea.setAttribute('localSheetId', String(localSheetId));
    printArea.textContent = `${quoteSheetName(name)}!${classPrintAreas[classIndex]}`;
    namesContainer.appendChild(printArea);
    const printTitles = workbookDocument.createElementNS(spreadsheetNamespace, 'definedName');
    printTitles.setAttribute('name', '_xlnm.Print_Titles');
    printTitles.setAttribute('localSheetId', String(localSheetId));
    printTitles.textContent = `${quoteSheetName(name)}!$3:$6`;
    namesContainer.appendChild(printTitles);
  });

  const relationshipDocument = parseXml(relationshipXml);
  const relationshipRoot = relationshipDocument.documentElement;
  Array.from(relationshipRoot.children)
    .filter((relationship) =>
      relationship.getAttribute('Type')?.endsWith('/worksheet') ||
      relationship.getAttribute('Type')?.endsWith('/calcChain')
    )
    .forEach((relationship) => relationshipRoot.removeChild(relationship));
  sheetNames.forEach((_name, index) => {
    const relationship = relationshipDocument.createElementNS(
      packageRelationshipsNamespace,
      'Relationship'
    );
    relationship.setAttribute('Id', `rId${1000 + index}`);
    relationship.setAttribute(
      'Type',
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet'
    );
    relationship.setAttribute('Target', `worksheets/sheet${index + 1}.xml`);
    relationshipRoot.appendChild(relationship);
  });

  const contentTypesDocument = parseXml(contentTypesXml);
  const contentTypesRoot = contentTypesDocument.documentElement;
  const overrides = Array.from(contentTypesRoot.children).filter((node) =>
    /^\/xl\/worksheets\/sheet\d+\.xml$/.test(node.getAttribute('PartName') || '') ||
    node.getAttribute('PartName') === '/xl/calcChain.xml'
  );
  overrides.forEach((node) => contentTypesRoot.removeChild(node));
  sheetNames.forEach((_name, index) => {
    const override = contentTypesDocument.createElementNS(
      'http://schemas.openxmlformats.org/package/2006/content-types',
      'Override'
    );
    override.setAttribute('PartName', `/xl/worksheets/sheet${index + 1}.xml`);
    override.setAttribute(
      'ContentType',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml'
    );
    contentTypesRoot.appendChild(override);
  });

  return {
    workbookXml: serializeXml(workbookDocument),
    relationshipXml: serializeXml(relationshipDocument),
    contentTypesXml: serializeXml(contentTypesDocument),
  };
};

export const buildLeagueResultsWorkbook = (
  templateBytes: Uint8Array,
  trial: LeagueWorkbookTrial,
  classes: LeagueWorkbookClass[]
): Uint8Array => {
  const files = unzipSync(templateBytes);
  const templateClassXml = strFromU8(files['xl/worksheets/sheet3.xml']);
  const templateClassRelationships = files['xl/worksheets/_rels/sheet3.xml.rels'];
  if (!templateClassXml || !files['xl/worksheets/sheet2.xml']) {
    throw new Error('The league results workbook template is missing required sheets.');
  }

  files['xl/worksheets/sheet2.xml'] = strToU8(
    populateRecapSheet(strFromU8(files['xl/worksheets/sheet2.xml']), trial, classes)
  );
  files['xl/styles.xml'] = strToU8(
    setRecapRunFeeFontSize(strFromU8(files['xl/styles.xml']))
  );

  classes.forEach((classData, index) => {
    const sheetNumber = index + 3;
    const existing = files[`xl/worksheets/sheet${sheetNumber}.xml`];
    files[`xl/worksheets/sheet${sheetNumber}.xml`] = strToU8(
      populateClassSheet(existing ? strFromU8(existing) : templateClassXml, trial, classData)
    );
    if (!existing && templateClassRelationships) {
      files[`xl/worksheets/_rels/sheet${sheetNumber}.xml.rels`] = templateClassRelationships;
    }
  });

  const usedNames = new Set<string>(['example. directions_sheet', 'trial recap']);
  const classSheetNames = classes.map((classData) => safeSheetName(classData.className, usedNames));
  const sheetNames = ['Example. Directions_Sheet', 'TRIAL RECAP', ...classSheetNames];
  const classPrintAreas = classes.map((classData) => {
    const populatedRounds = classData.rounds.filter((round) =>
      Array.from(round.results.values()).some((result) => result !== '-')
    );
    const lastColumn = columnName(Math.max(8, 2 + populatedRounds.length));
    const lastRow = Math.max(7, 6 + classData.participants.length);
    return `$A$1:$${lastColumn}$${lastRow}`;
  });
  const definitions = updateWorkbookDefinition(
    strFromU8(files['xl/workbook.xml']),
    strFromU8(files['xl/_rels/workbook.xml.rels']),
    strFromU8(files['[Content_Types].xml']),
    sheetNames,
    classPrintAreas
  );
  files['xl/workbook.xml'] = strToU8(definitions.workbookXml);
  files['xl/_rels/workbook.xml.rels'] = strToU8(definitions.relationshipXml);
  files['[Content_Types].xml'] = strToU8(definitions.contentTypesXml);

  // The template calculation chain contains cached references from its blank state.
  // Removing it makes Excel calculate the populated recap formulas on open.
  delete files['xl/calcChain.xml'];
  return zipSync(files);
};
