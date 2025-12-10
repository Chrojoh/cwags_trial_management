import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Export ONE score sheet per round as a single-page, portrait PDF
 * Logos placed left + right under date line, above scent boxes
 */
export async function exportScoreSheetsPDF(
  trial: any,
  roundsForDay: any[],
  entriesResult: any,
  formattedDate: string
) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]); // Portrait (8.5 x 11)

  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  let y = height - 40;

  /* ───────────────── HEADER ───────────────── */

  // Title
  page.drawText('Scent Detection Master Score Sheet', {
    x: margin,
    y,
    size: 18,
    font: bold
  });

  // Date (right)
  page.drawText(`Date: ${formattedDate}`, {
    x: width - margin - 200,
    y,
    size: 14,
    font: bold
  });

  y -= 40;

  /* ───────────────── LOGOS ───────────────── */

  const logoBytes = await fetch('/cwags-logo.png').then(r => r.arrayBuffer());
  const logo = await pdf.embedPng(logoBytes);

  const logoHeight = 50;
  const logoWidth = (logo.width / logo.height) * logoHeight;

  // Left logo
  page.drawImage(logo, {
    x: margin,
    y: y - logoHeight,
    width: logoWidth,
    height: logoHeight
  });

  // Right logo
  page.drawImage(logo, {
    x: width - margin - logoWidth,
    y: y - logoHeight,
    width: logoWidth,
    height: logoHeight
  });

  y -= logoHeight + 20;

  /* ───────────────── CLASS INFO ───────────────── */

  const round = roundsForDay[0];

  page.drawText(`CLASS: ${round.class_name}`, {
    x: margin,
    y,
    size: 14,
    font: bold
  });

  page.drawText(
    `ROUND: ${round.round_number}${round.games_subclass ? ` - ${round.games_subclass}` : ''}`,
    {
      x: margin,
      y: y - 20,
      size: 14,
      font: bold
    }
  );

  page.drawText(`JUDGE: ${round.judge_name}`, {
    x: width / 2,
    y,
    size: 14,
    font: bold
  });

  y -= 60;

  /* ───────────────── SCENT BOXES ───────────────── */

  const scentBoxWidth = (width - margin * 2) / 4;
  const scentBoxHeight = 60;

  ['Scent 1', 'Scent 2', 'Scent 3', 'Scent 4'].forEach((label, i) => {
    const x = margin + i * scentBoxWidth;

    page.drawRectangle({
      x,
      y,
      width: scentBoxWidth,
      height: scentBoxHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    });

    page.drawText(label, {
      x: x + 6,
      y: y + scentBoxHeight - 18,
      size: 10,
      font: bold
    });
  });

  y -= scentBoxHeight + 12;

  /* ───────────────── TABLE HEADER ───────────────── */

  const rowHeight = 22;
  const cols = [
    { label: 'Reg #', w: 80 },
    { label: 'Handler / Dog', w: 230 },
    { label: 'Time', w: 80 },
    { label: 'Pass / Fail', w: 80 }
  ];

  let x = margin;
  cols.forEach(col => {
    page.drawRectangle({
      x,
      y,
      width: col.w,
      height: rowHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    });

    page.drawText(col.label, {
      x: x + 6,
      y: y + 6,
      size: 10,
      font: bold
    });

    x += col.w;
  });

  y -= rowHeight;

  /* ───────────────── ENTRIES ───────────────── */

  const used = new Set<string>();

  entriesResult.data.forEach((entry: any) => {
    entry.entry_selections?.forEach((sel: any) => {
      if (used.has(sel.id)) return;
      if (sel.entry_status === 'withdrawn') return;

      used.add(sel.id);

      let x = margin;

      const values = [
        entry.cwags_number,
        `${entry.handler_name} / ${entry.dog_call_name}${sel.entry_type === 'feo' ? ' (FEO)' : ''}`,
        '',
        ''
      ];

      values.forEach((val, i) => {
        page.drawRectangle({
          x,
          y,
          width: cols[i].w,
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1
        });

        page.drawText(val || '', {
          x: x + 6,
          y: y + 6,
          size: 10,
          font
        });

        x += cols[i].w;
      });

      y -= rowHeight;
    });
  });

  /* ───────────────── SAVE ───────────────── */

const bytes = await pdf.save();



/**
 * TypeScript DOM libs are overly strict about Uint8Array / BlobPart.
 * This cast is safe and standard in browser binaries.
 */
const blob = new Blob(
  [bytes as unknown as BlobPart],
  { type: 'application/pdf' }
);





  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Score-Sheet-${trial.trial_name}-${formattedDate}.pdf`;
  a.click();
}
