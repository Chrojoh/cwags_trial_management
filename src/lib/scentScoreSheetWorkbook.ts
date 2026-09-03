import XLSX from 'xlsx-js-style';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { SCENT_BLUE, SCENT_FAULTS, SCENT_ROW_HEIGHT, type ScentPage } from './scentScoreSheetLayout';

export function createScentScoreSheetWorkbook(pages: ScentPage[], date: string, logo?: Uint8Array): Uint8Array {
  const workbook = XLSX.utils.book_new();
  for (const [pageIndex, page] of pages.entries()) {
    const paired = page.rounds.length === 2;
    const header = paired ? 10 : 8; // zero-based column-heading row
    const firstData = header + 1;
    const rows = firstData + page.capacity * page.rounds.length;
    const data: (string | number)[][] = Array.from({ length: rows }, () => Array(20).fill(''));
    data[0][0] = 'Scent Detection Master Score Sheet';
    data[0][11] = 'Date:'; data[0][15] = date;
    data[1][4] = 'CLASS:'; data[1][6] = page.className;
    data[3][4] = 'ROUNDS'; data[3][6] = page.rounds.map((round) => round.round_number || 1).join(', ');
    data[3][10] = 'JUDGE:'; data[3][12] = page.judge;
    const merges = ['A1:K1','L1:O1','P1:T1','E2:F2','G2:L2','E4:F4','G4:J4','K4:L4','M4:T4'].map(XLSX.utils.decode_range);
    page.rounds.forEach((round, index) => {
      const row = 5 + index * 2;
      for (let scent = 0; scent < 4; scent++) {
        const col = scent * 5;
        data[row][col] = `Round ${round.round_number || 1} — Scent ${scent + 1}`;
        data[row + 1][col] = 'Located in/on';
        merges.push({ s: { r: row, c: col }, e: { r: row, c: col + 4 } }, { s: { r: row + 1, c: col }, e: { r: row + 1, c: col + 4 } });
      }
    });
    data[header - 1][0] = SCENT_FAULTS;
    merges.push({ s: { r: header - 1, c: 0 }, e: { r: header - 1, c: 19 } });
    data[header] = ['Round','','Handler\nDog / C-WAGS #','','','','Scent 1','Scent 2','Scent 3','Scent 4','Fault 1','','','Fault 2','','','TIME','','Pass / Fail',''];
    const mergeLine = (row: number) => {
      for (const [start, end] of [[0,1],[10,12],[13,15],[16,17]]) merges.push({ s: { r: row, c: start }, e: { r: row, c: end } });
    };
    mergeLine(header);
    merges.push({ s: { r: header, c: 18 }, e: { r: header, c: 19 } });
    merges.push({ s: { r: header, c: 2 }, e: { r: header, c: 5 } });
    for (let dogIndex = 0; dogIndex < page.capacity; dogIndex++) {
      const start = firstData + dogIndex * page.rounds.length;
      const dog = page.dogs[dogIndex];
      const identity = dog?.lines.find(Boolean);
      if (identity) data[start][2] = `${identity.handler.trim()}\n${identity.dog.trim()} / ${identity.registration}`;
      merges.push({ s: { r: start, c: 2 }, e: { r: start + page.rounds.length - 1, c: 5 } });
      page.rounds.forEach((round, index) => {
        mergeLine(start + index);
        if (dog?.lines[index]) {
          data[start + index][0] = `Round ${round.round_number || 1}`;
          data[start + index][18] = 'P';
          data[start + index][19] = 'F';
        }
      });
    }
    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet['!merges'] = merges;
    sheet['!cols'] = Array.from({ length: 20 }, () => ({ wch: 8 }));
    sheet['!rows'] = data.map((_, row) => ({ hpt: row >= firstData ? SCENT_ROW_HEIGHT : row >= 5 && row < header - 1 ? 80 : row >= header - 1 ? 43 : row === 2 || row === 4 ? 15 : 36 }));
    for (let row = 0; row < rows; row++) for (let col = 0; col < 20; col++) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      const blue = paired && ((row === 7 || row === 8) || (row >= firstData && (row - firstData) % 2 === 1 && !(col >= 2 && col <= 5)));
      const fontSize = row === 0 ? 34 : row === 3 ? (col === 4 ? 22 : 26) : row >= 5 && row < header - 1 ? 28 : row === 1 ? 28 : 18;
      sheet[address].s = {
        font: { name: 'Calibri', sz: row >= firstData && col >= 18 ? 28 : fontSize, bold: row >= firstData && col >= 18 ? false : row < header - 1 || row === header },
        alignment: { horizontal: row === 0 ? (col >= 11 && col <= 14 ? 'right' : 'left') : row === 1 ? (col === 4 ? 'right' : 'left') : row === 3 ? (col === 4 ? 'right' : 'left') : 'center', vertical: row >= 5 && row < header - 1 ? 'top' : 'center', wrapText: !(row === 0 || (row === 3 && col === 4)), shrinkToFit: false },
        fill: { fgColor: { rgb: blue ? SCENT_BLUE : row === header ? 'D3D3D3' : 'FFFFFF' } },
        border: row >= 5 ? Object.fromEntries(['top','bottom','left','right'].map((side) => {
          const inDogBlock = row >= firstData;
          const blockOffset = (row - firstData) % page.rounds.length;
          const separator = inDogBlock && (
            (side === 'bottom' && (blockOffset === page.rounds.length - 1 || (col >= 2 && col <= 5))) ||
            (side === 'top' && row > firstData && blockOffset === 0)
          );
          return [side, { style: separator ? 'medium' : 'thin', color: { rgb: '000000' } }];
        })) : undefined,
      };
    }
    const suffix = ` ${pageIndex + 1}`;
    const name = `${page.className} R${page.rounds.map((round) => round.round_number || 1).join('-')}`.replace(/[:\\/?*[\]]/g, '').slice(0, 31 - suffix.length) + suffix;
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  }
  // The existing Excel library drops pageSetup, so explicitly preserve Letter
  // paper and the original 50% font/print scale in the final OOXML package.
  const bytes = new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
  const zip = unzipSync(bytes);
  for (const path of Object.keys(zip).filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/.test(path))) {
    const xml = strFromU8(zip[path]);
    const marker = ['<ignoredErrors','<drawing','<legacyDrawing','<tableParts','<extLst'].find((item) => xml.includes(item)) || '</worksheet>';
    zip[path] = strToU8(xml.replace(marker, '<printOptions horizontalCentered="1"/><pageMargins left="0.5" right="0.5" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup scale="50" orientation="portrait" paperSize="1"/>' + marker));
  }
  if (logo) {
    // Embed the public PNG once and reference it from every printed sheet.
    const view = new DataView(logo.buffer, logo.byteOffset, logo.byteLength);
    if (logo.length < 24 || view.getUint32(0) !== 0x89504e47) throw new Error('Score-sheet logo must be a PNG');
    const width = view.getUint32(16), height = view.getUint32(20);
    if (!width || !height) throw new Error('Invalid score-sheet logo dimensions');
    const relNS = 'http://schemas.openxmlformats.org/package/2006/relationships';
    const officeNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    zip['xl/media/cwags-logo.png'] = logo;
    let types = strFromU8(zip['[Content_Types].xml']);
    if (!types.includes('Extension="png"')) types = types.replace('</Types>', '<Default Extension="png" ContentType="image/png"/></Types>');
    for (let n = 1; n <= pages.length; n++) {
      const sheetPath = `xl/worksheets/sheet${n}.xml`;
      let xml = strFromU8(zip[sheetPath]);
      // A2:C4: three equal columns, and 36 + 15 + 36 point rows.
      const columnWidth = Number(xml.match(/<col\b[^>]*\bwidth="([\d.]+)"/)?.[1] || 8.83203125);
      const frameWidth = Math.floor(((256 * columnWidth + Math.floor(128 / 7)) / 256) * 7) * 3;
      const frameHeight = 87 * 96 / 72;
      const scale = Math.min((frameWidth - 8) / width, (frameHeight - 8) / height);
      const emu = (px: number) => Math.round(px * 9525);
      const cx = emu(width * scale), cy = emu(height * scale);
      const x = emu((frameWidth - width * scale) / 2), y = emu((frameHeight - height * scale) / 2);
      const relationshipsPath = `xl/worksheets/_rels/sheet${n}.xml.rels`;
      let rels = zip[relationshipsPath] ? strFromU8(zip[relationshipsPath]) : `<Relationships xmlns="${relNS}"></Relationships>`;
      let id = 'rIdScentLogo';
      while (rels.includes(`Id="${id}"`)) id += '_';
      rels = rels.replace('</Relationships>', `<Relationship Id="${id}" Type="${officeNS}/drawing" Target="../drawings/drawing${n}.xml"/></Relationships>`);
      zip[relationshipsPath] = strToU8(rels);
      if (!xml.includes('xmlns:r=')) xml = xml.replace('<worksheet ', `<worksheet xmlns:r="${officeNS}" `);
      const marker = ['<legacyDrawing', '<tableParts', '<extLst'].find((item) => xml.includes(item)) || '</worksheet>';
      zip[sheetPath] = strToU8(xml.replace(marker, `<drawing r:id="${id}"/>${marker}`));
      zip[`xl/drawings/drawing${n}.xml`] = strToU8(`<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>${x}</xdr:colOff><xdr:row>1</xdr:row><xdr:rowOff>${y}</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="1" name="C-WAGS logo"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="${officeNS}" r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`);
      zip[`xl/drawings/_rels/drawing${n}.xml.rels`] = strToU8(`<Relationships xmlns="${relNS}"><Relationship Id="rId1" Type="${officeNS}/image" Target="../media/cwags-logo.png"/></Relationships>`);
      types = types.replace('</Types>', `<Override PartName="/xl/drawings/drawing${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`);
    }
    zip['[Content_Types].xml'] = strToU8(types);
  }
  return zipSync(zip);
}
