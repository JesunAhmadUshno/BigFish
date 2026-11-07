// TheSportsDB parsing: unplayed or postponed events must not become training rows.
import test from 'node:test';
import assert from 'node:assert/strict';

test('events with null or missing scores are skipped, played ones are kept', async () => {
  const events = [
    { strHomeTeam: 'A', strAwayTeam: 'B', intHomeScore: null, intAwayScore: null, strPostponed: 'yes' },
    { strHomeTeam: 'C', strAwayTeam: 'D', intHomeScore: '', intAwayScore: '1' },
    { strHomeTeam: 'E', strAwayTeam: 'F', intHomeScore: '2', intAwayScore: '0' },
    { strHomeTeam: 'G', strAwayTeam: 'H', intHomeScore: '1', intAwayScore: '1' },
  ];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ events }) });
  try {
    const { fetchHistoricalMatches } = await import('../lib/thesportsdb.js');
    const rows = await fetchHistoricalMatches();
    assert.deepEqual(rows.map((r) => [r.home, r.result]), [['E', 'home'], ['G', 'draw']]);
  } finally {
    globalThis.fetch = realFetch;
  }
});
