// LookupPaletteProvider is a pure colour-name -> hex mapping; no DB, no model.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LookupPaletteProvider } from './palette';

const provider = new LookupPaletteProvider();

test('LookupPaletteProvider: maps primary and distinct secondary to swatches, coverage 1 then 0.4', async () => {
  const out = await provider.extract([
    { garmentId: 1, photoKey: null, primaryColor: 'navy', secondaryColor: 'white' },
  ]);
  assert.deepEqual(out.get(1), [
    { hex: '#2f4a7a', coverage: 1 },
    { hex: '#f4f1ea', coverage: 0.4 },
  ]);
});

test('LookupPaletteProvider: an unknown colour name still yields a neutral swatch, not nothing', async () => {
  const out = await provider.extract([
    { garmentId: 2, photoKey: null, primaryColor: 'ultraviolet', secondaryColor: null },
  ]);
  assert.equal(out.get(2)?.length, 1);
  assert.equal(out.get(2)?.[0].coverage, 1);
});

test('LookupPaletteProvider: a garment with no colour at all is omitted from the map', async () => {
  const out = await provider.extract([
    { garmentId: 3, photoKey: 'photo/x', primaryColor: null, secondaryColor: null },
  ]);
  assert.equal(out.has(3), false);
});

test('LookupPaletteProvider: a secondary equal to the primary is not repeated', async () => {
  const out = await provider.extract([
    { garmentId: 4, photoKey: null, primaryColor: 'navy', secondaryColor: 'indigo' }, // both -> #2f4a7a
  ]);
  assert.equal(out.get(4)?.length, 1);
});
