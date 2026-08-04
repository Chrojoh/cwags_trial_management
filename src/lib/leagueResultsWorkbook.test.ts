import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { splitLocation } from './leagueResultsWorkbook';

describe('league results recap location', () => {
  it('ignores the venue when filling the city and province cells', () => {
    assert.deepEqual(splitLocation('Keés Judo, West Kelowna, BC, Canada'), {
      city: 'West Kelowna',
      province: 'BC',
    });
  });

  it('supports legacy city, province locations', () => {
    assert.deepEqual(splitLocation('Calgary, AB'), { city: 'Calgary', province: 'AB' });
  });
});
