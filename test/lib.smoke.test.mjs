// Smoke tests for the pure quant modules in lib/. Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { predictMatch, generateScorelineMatrix, derive1X2 } from '../lib/dixon-coles.js';
import { fullKelly, calculateGrowthRate } from '../lib/kelly-criterion.js';
import { balancedBooksMethod, oddsRatioMethod, wpoMethod } from '../lib/shin-method.js';
import { processMatchResult } from '../lib/elo-updater.js';
import { runMonteCarloSimulation } from '../lib/monte-carlo.js';
import { calculateHypoxicDecay, generateDecayCurve } from '../lib/physiometric-agent.js';
import { TEAM_ELO } from '../lib/constants.js';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test('Dixon-Coles matrix keeps almost all mass inside 0..10 goals and 1X2 sums to 1', () => {
  const m = generateScorelineMatrix(2.15, 0.86, -0.13);
  const mass = m.flat().reduce((s, p) => s + p, 0);
  assert.ok(mass > 0.999 && mass <= 1.000001, `mass ${mass}`);
  const { home, draw, away } = derive1X2(m);
  close(home + draw + away, 1);
});

test('neutral venue with equal Elo gives a symmetric prediction', () => {
  const p = predictMatch({ homeElo: 1900, awayElo: 1900, homeAdvantage: 0 });
  close(p.parameters.lambda, p.parameters.mu);
  close(p.probabilities1X2.home, p.probabilities1X2.away);
});

test('default home advantage still favours the first-named team at equal Elo', () => {
  const p = predictMatch({ homeElo: 1900, awayElo: 1900 });
  assert.ok(p.probabilities1X2.home > p.probabilities1X2.away);
});

test('Kelly fraction matches (bp - q) / b and maximises growth', () => {
  const p = 0.55, odds = 2.0, b = odds - 1;
  const f = fullKelly(p, odds);
  close(f, (b * p - (1 - p)) / b);
  const g = calculateGrowthRate(p, odds, f);
  assert.ok(g > calculateGrowthRate(p, odds, f * 0.5));
  assert.ok(g > calculateGrowthRate(p, odds, f * 1.5));
});

test('balanced, odds-ratio and WPO de-vig each return probabilities summing to 1', () => {
  const odds = [2.1, 3.4, 3.5];
  const inv = odds.map((o) => 1 / o), s = inv.reduce((a, b) => a + b, 0);
  balancedBooksMethod(odds).probabilities.forEach((p, i) => close(p, inv[i] / s));
  for (const fn of [oddsRatioMethod, wpoMethod]) close(fn(odds).probabilities.reduce((a, b) => a + b, 0), 1);
});

test('Elo update is zero-sum for a decisive result and rewards the underdog more', () => {
  const r = processMatchResult(TEAM_ELO.Argentina, TEAM_ELO.Iraq, 0, 1);
  assert.equal(r.homeEloNew - TEAM_ELO.Argentina, -(r.awayEloNew - TEAM_ELO.Iraq));
  const fav = processMatchResult(TEAM_ELO.Argentina, TEAM_ELO.Iraq, 1, 0);
  assert.ok(Math.abs(r.eloChange) > Math.abs(fav.eloChange));
});

test('seeded Monte Carlo is reproducible', () => {
  const a = runMonteCarloSimulation({ homeLambda: 1.4, awayLambda: 1.1, iterations: 2000, seed: 7 });
  const b = runMonteCarloSimulation({ homeLambda: 1.4, awayLambda: 1.1, iterations: 2000, seed: 7 });
  assert.deepEqual(a.probabilities, b.probabilities);
  close(a.probabilities.home + a.probabilities.draw + a.probabilities.away, 1);
});

test('physiology: no hypoxic decay below the threshold, decay at Azteca for a sea-level team', () => {
  assert.equal(calculateHypoxicDecay(1000, 0, 90), 1);
  const c = generateDecayCurve({ teamName: 'England', venueId: 'estadio-azteca', wbgt: 25 });
  assert.ok(c.summary.minimum < 1);
});
