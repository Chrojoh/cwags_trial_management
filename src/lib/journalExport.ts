export interface ExportJournalItem {
  id: string;
  timestamp: string;
  type: string;
  handler_name: string;
  dog_call_name: string;
  cwags_number: string;
  description: string;
  amount?: number;
  payment_method?: string;
  payment_received_by?: string;
  recorded_by?: string;
  notes?: string;
}

export function journalExportRows(items: ExportJournalItem[], timezone: string) {
  const formatTime = (value: string) => new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value));
  return items.map(item => ({
    time: formatTime(item.timestamp),
    type: item.type.replaceAll('_', ' '),
    handler: item.handler_name,
    dog: item.dog_call_name,
    number: item.cwags_number,
    description: item.description,
    amount: item.amount ?? null,
    method: item.payment_method || '',
    receivedBy: item.payment_received_by || '',
    recordedBy: item.recorded_by || '',
    notes: item.notes || '',
  }));
}

export function journalExportFilename(trialName: string, extension: 'xlsx' | 'pdf') {
  const safeName = trialName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'trial';
  const day = new Date().toISOString().slice(0, 10);
  return `${safeName}-activity-journal-${day}.${extension}`;
}

function downloadBytes(bytes: BlobPart, name: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  const timer = setTimeout(() => URL.revokeObjectURL(url), 30_000);
  if (typeof window === 'undefined') (timer as NodeJS.Timeout).unref?.();
}

export async function exportJournalExcel(items: ExportJournalItem[], trialName: string, timezone: string) {
  const xlsxModule = await import('xlsx-js-style');
  const XLSX = xlsxModule.default || xlsxModule;
  const rows = journalExportRows(items, timezone);
  const workbook = XLSX.utils.book_new();
  const heading = ['Recorded at', 'Event', 'Handler', 'Dog', 'C-WAGS #', 'Description',
    'Amount', 'Method', 'Received by', 'Recorded by', 'Note'];
  const sheet = XLSX.utils.aoa_to_sheet([
    [`${trialName} - Activity Journal`],
    [`Trial time zone: ${timezone}. Showing ${rows.length} currently displayed event(s).`],
    [], heading,
    ...rows.map(row => [row.time, row.type, row.handler, row.dog, row.number,
      row.description, row.amount, row.method, row.receivedBy, row.recordedBy, row.notes]),
  ]);
  sheet['!cols'] = [20, 24, 25, 20, 24, 72, 14, 18, 25, 25, 38].map(wch => ({ wch }));
  sheet['!autofilter'] = { ref: `A4:K${Math.max(4, rows.length + 4)}` };
  for (let column = 0; column < heading.length; column++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 3, c: column })];
    if (cell) cell.s = { font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E3A5F' } }, alignment: { wrapText: true } };
  }
  for (let index = 0; index < rows.length; index++) {
    const amountCell = sheet[`G${index + 5}`];
    if (amountCell?.t === 'n') amountCell.z = '"$"#,##0.00';
    const descriptionCell = sheet[`F${index + 5}`];
    if (descriptionCell) descriptionCell.s = { alignment: { wrapText: true, vertical: 'top' } };
  }
  XLSX.utils.book_append_sheet(workbook, sheet, 'Journal');

  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  downloadBytes(bytes, journalExportFilename(trialName, 'xlsx'),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

function pdfSafe(value: string) {
  return value.normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/\r?\n/g, ' ').replace(/[→]/g, ' to ')
    .replace(/[➕]/g, 'Added: ').replace(/[➖]/g, 'Removed: ')
    .replace(/[^\x20-\x7E]/g, '?');
}

export async function exportJournalPdf(items: ExportJournalItem[], trialName: string, timezone: string) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const rows = journalExportRows(items, timezone);
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = 612;
  const margin = 40;
  let page = pdf.addPage([width, 792]);
  let y = 750;
  const addPage = () => {
    page = pdf.addPage([width, 792]);
    y = 750;
    page.drawText(pdfSafe(`${trialName} - Activity Journal`), { x: margin, y: 770, size: 11,
      font: bold, color: rgb(0.12, 0.23, 0.37) });
  };
  const write = (value: string, size = 9, strong = false) => {
    const font = strong ? bold : regular;
    const words = pdfSafe(value).split(/\s+/);
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width - margin * 2 && line) {
        if (y < 52) addPage();
        page.drawText(line, { x: margin, y, size, font });
        y -= size + 5;
        line = word;
      } else line = next;
    }
    if (line) {
      if (y < 52) addPage();
      page.drawText(line, { x: margin, y, size, font });
      y -= size + 5;
    }
  };
  write(`${trialName} - Activity Journal`, 17, true);
  write(`Trial time zone: ${timezone}   Displayed events: ${rows.length}`, 10);
  y -= 10;
  for (const row of rows) {
    if (y < 100) addPage();
    write(`${row.time}  ${row.type.toUpperCase()}  ${row.handler} / ${row.dog}`, 10, true);
    write(`C-WAGS: ${row.number}   ${row.description}`, 9);
    const facts = [row.amount !== null ? `Amount: $${row.amount.toFixed(2)}` : '',
      row.method ? `Method: ${row.method}` : '',
      row.receivedBy ? `Received by: ${row.receivedBy}` : '',
      row.recordedBy ? `Recorded by: ${row.recordedBy}` : '',
      row.notes ? `Note: ${row.notes}` : ''].filter(Boolean);
    if (facts.length) write(facts.join('   '), 9);
    y -= 11;
  }
  for (const p of pdf.getPages()) {
    p.drawText(`Exported ${new Date().toISOString().slice(0, 10)}   Page ${pdf.getPages().indexOf(p) + 1} of ${pdf.getPageCount()}`,
      { x: margin, y: 25, size: 8, font: regular, color: rgb(0.35, 0.35, 0.35) });
  }
  const bytes = await pdf.save();
  downloadBytes(Uint8Array.from(bytes).buffer, journalExportFilename(trialName, 'pdf'), 'application/pdf');
}
