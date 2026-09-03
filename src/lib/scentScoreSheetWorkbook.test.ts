import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import XLSX from 'xlsx-js-style';
import { unzipSync, strFromU8 } from 'fflate';
import { buildScentPages } from './scentScoreSheetLayout';
import { createScentScoreSheetWorkbook } from './scentScoreSheetWorkbook';

test('Excel output has blank first round, merged identity, duplicated scent boxes and fixed Letter sizing', () => {
  const rounds = [1,2,3].map((n) => ({id:`r${n}`,round_number:n,class_name:'Patrol 1',class_id:'c',class_type:'scent',judge_name:'Judge A',trial_day_id:'d'}));
  const pages=buildScentPages(rounds,[{entryId:'e',selectionId:'s',roundId:'r2',handler:'Handler',dog:'Dog',registration:'12-3456-01'}]);
  const bytes=createScentScoreSheetWorkbook(pages,'05/22/2026');
  const workbook=XLSX.read(bytes,{type:'array'});
  assert.equal(workbook.SheetNames.length,2);
  const sheet=workbook.Sheets[workbook.SheetNames[0]];
  assert.equal(sheet.A12.v,'');
  assert.equal(sheet.A13.v,'Round 2');
  assert.equal(sheet.S12.v,''); assert.equal(sheet.T12.v,'');
  assert.equal(sheet.S13.v,'P'); assert.equal(sheet.T13.v,'F');
  assert.equal(sheet.S14.v,''); assert.equal(sheet.T14.v,'');
  assert.ok(!sheet['!merges']?.some((m) => m.s.r >= 11 && m.s.c <= 18 && m.e.c >= 19));
  assert.match(sheet.C12.v,/Handler\nDog/);
  assert.ok(sheet['!merges']?.some((m) => XLSX.utils.encode_range(m)==='C12:F13'));
  assert.match(sheet.A6.v,/Round 1/); assert.match(sheet.A8.v,/Round 2/);
  const xml=strFromU8(unzipSync(bytes)['xl/worksheets/sheet1.xml']);
  assert.match(xml,/paperSize="1"/);assert.match(xml,/scale="50"/);
  assert.equal((xml.match(/<pageMargins /g)||[]).length,1);
  assert.match(xml,/ht="50"/);
});

test('public logo is embedded on every sheet, centered inside A2:C4 without stretching', () => {
  const rounds = [1,2,3].map((n) => ({id:`r${n}`,round_number:n,class_name:'Patrol 1',class_type:'scent',judge_name:'Judge A',trial_day_id:'d'}));
  const pages = buildScentPages(rounds, []);
  const logo = new Uint8Array(readFileSync('public/cwags-logo.png'));
  const zip = unzipSync(createScentScoreSheetWorkbook(pages, '05/22/2026', logo));
  assert.deepEqual(zip['xl/media/cwags-logo.png'], logo);
  for (let n = 1; n <= pages.length; n++) {
    assert.match(strFromU8(zip[`xl/worksheets/sheet${n}.xml`]), /<drawing r:id="rIdScentLogo"\/>/);
    assert.match(strFromU8(zip[`xl/worksheets/_rels/sheet${n}.xml.rels`]), new RegExp(`drawing${n}\\.xml`));
    const drawing = strFromU8(zip[`xl/drawings/drawing${n}.xml`]);
    assert.match(drawing, /<xdr:col>0<\/xdr:col>/);
    assert.match(drawing, /<xdr:row>1<\/xdr:row>/);
    const [, cx, cy] = drawing.match(/<xdr:ext cx="(\d+)" cy="(\d+)"/)!;
    const view = new DataView(logo.buffer);
    assert.ok(Math.abs(Number(cx) / Number(cy) - view.getUint32(16) / view.getUint32(20)) < 0.00001);
    assert.equal(Number(cy), 108 * 9525);
    assert.match(strFromU8(zip[`xl/drawings/_rels/drawing${n}.xml.rels`]), /\.\.\/media\/cwags-logo.png/);
  }
});
