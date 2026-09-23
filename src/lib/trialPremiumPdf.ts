import { PDFDocument, PDFPage, PDFFont, PDFString, StandardFonts, rgb } from 'pdf-lib';
import type { TrialPremiumModel } from '@/types/trialPremium';

const margin = 42;
const pageWidth = 612;
const pageHeight = 792;

const clean = (value: string) => value.replace(/[\u2010-\u2015]/g, '-').trim();
const formatDate = (value: string) => {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
};

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = clean(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
    else { if (line) lines.push(line); line = word; }
  });
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

export async function createTrialPremiumPdf(
  model: TrialPremiumModel,
  options: { mapImageBytes?: Uint8Array; mapMimeType?: string; publicEntryUrl?: string } = {}
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page!: PDFPage;
  let y = 0;

  const addPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    y = pageHeight - 42;
    page.drawText('Independent C-WAGS Trial Premium', { x: margin, y, size: 9, font: bold, color: rgb(0.82, 0.27, 0.03) });
    page.drawText(model.trial.trialName, { x: margin, y: y - 22, size: 17, font: bold, maxWidth: pageWidth - margin * 2 });
    y -= 48;
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.8, color: rgb(0.82, 0.27, 0.03) });
    y -= 20;
  };
  const need = (height: number) => { if (y - height < 48) addPage(); };
  const paragraph = (text: string, size = 9, inset = 0) => {
    const lines = wrap(text || 'Not provided.', font, size, pageWidth - margin * 2 - inset);
    lines.forEach((line) => {
      need(size + 8);
      page.drawText(line, { x: margin + inset, y, size, font });
      y -= size + 4;
    });
    y -= 5;
  };
  const section = (title: string, text: string) => {
    need(54);
    page.drawText(title, { x: margin, y, size: 11, font: bold, color: rgb(0.25, 0.16, 0.12) });
    y -= 17;
    paragraph(text);
  };
  const link = (label: string, url: string) => {
    need(26);
    const size = 9;
    page.drawText(label, { x: margin, y, size, font: bold, color: rgb(0.05, 0.32, 0.72) });
    const width = bold.widthOfTextAtSize(label, size);
    const annotation = page.doc.context.register(page.doc.context.obj({
      Type: 'Annot', Subtype: 'Link', Rect: [margin, y - 2, margin + width, y + size + 2], Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
    }));
    page.node.addAnnot(annotation);
    y -= 22;
  };

  addPage();
  paragraph(`${model.trial.clubName} | ${model.trial.location}`, 10);
  paragraph(`${formatDate(model.trial.startDate)}${model.trial.endDate !== model.trial.startDate ? ` to ${formatDate(model.trial.endDate)}` : ''}`, 10);
  section('Trial Secretary', [model.trial.secretaryName, model.trial.secretaryEmail, model.trial.secretaryPhone].filter(Boolean).join(' | '));
  section('Entry Period', `Opens: ${model.trial.entryOpenAt || 'See entry announcement'}${model.trial.entryTimezone ? ` (${model.trial.entryTimezone})` : ''}\nCloses: ${model.trial.entriesCloseDate || 'At the secretary\'s discretion when full'}`);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(model.trial.location)}`;
  link('Open venue map and directions', mapUrl);
  if (options.publicEntryUrl) link('Open the online entry form', options.publicEntryUrl);

  need(44);
  page.drawText('Classes, Rounds, Judges and Fees', { x: margin, y, size: 12, font: bold });
  y -= 20;
  model.schedule.forEach((row) => {
    need(22);
    const line = `${formatDate(row.date)} | ${row.className}, Round ${row.roundNumber} | Judge: ${row.judgeName || 'TBA'} | $${row.entryFee.toFixed(2)}${row.feoAvailable ? ' | FEO available' : ''}`;
    paragraph(line, 8, 8);
  });

  const sections: Array<[string, string]> = [
    ['Payment Instructions', model.content.paymentInstructions],
    ['Refund and Cancellation Policy', model.content.refundPolicy],
    ['Move-Up Policy', model.content.moveUpPolicy],
    ['Volunteer Information', model.content.volunteerInformation],
    ['Awards', model.content.awardsInformation],
    ['Facility', model.content.facilityInformation],
    ['Parking', model.content.parkingInformation],
    ['Crating', model.content.cratingInformation],
    ['Accessibility', model.content.accessibilityInformation],
    ['Veterinarian', model.content.veterinarianInformation],
    ['Emergency Information', model.content.emergencyInformation],
    ['Directions and Arrival', model.content.directionsInformation],
    ['Nearby Services', model.content.nearbyServices],
    ['Safety and Comfort Rules', model.content.safetyRules],
    ['Waitlist', model.content.waitlistInformation],
    ['Rules Acknowledgement', model.content.rulesAcknowledgement],
    ['Ring Setup', model.content.ringSetupTime || 'See secretary instructions.'],
    ["Judges' Briefing", model.content.judgesBriefingTime || 'See secretary instructions.'],
    ['Additional Information', model.content.additionalInformation],
    ['Waiver', model.trial.waiverText],
  ];
  for (const [title, text] of sections) {
    section(title, text);
    if (title === 'Directions and Arrival' && options.mapImageBytes?.length) {
      try {
        const image = options.mapMimeType === 'image/png'
          ? await pdf.embedPng(options.mapImageBytes)
          : await pdf.embedJpg(options.mapImageBytes);
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = 330;
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
        const width = image.width * scale;
        const height = image.height * scale;
        need(height + 18);
        page.drawImage(image, { x: margin + (maxWidth - width) / 2, y: y - height, width, height });
        y -= height + 18;
      } catch {
        section('Map image', 'The uploaded map image could not be rendered. Use the map link above.');
      }
    }
  }

  const pages = pdf.getPages();
  pages.forEach((pdfPage, index) => {
    pdfPage.drawText(`Page ${index + 1} of ${pages.length}`, { x: 510, y: 24, size: 8, font, color: rgb(0.35, 0.35, 0.35) });
  });
  return pdf.save();
}

export function premiumFilename(name: string) {
  const safe = name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'Trial';
  return `${safe}-Premium.pdf`;
}
