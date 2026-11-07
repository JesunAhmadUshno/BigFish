// Small helpers the page needs beyond lib/. Everything else is imported from ../../lib directly.
import { runMonteCarloSimulation } from '../../lib/monte-carlo.js';
import { fractionalKelly, fullKelly } from '../../lib/kelly-criterion.js';

// Textbook Shin (1993) via Jullien & Salanie (1994): p_i = (sqrt(z^2 + 4(1-z) pi_i^2 / S) - z) / (2(1-z)),
// with pi_i = 1/odds_i and S = sum(pi). Solve for z in [0, 1) so the p_i sum to 1 (the sum falls as z rises).
export function textbookShin(odds) {
  const pi = odds.map((o) => 1 / o);
  const S = pi.reduce((a, b) => a + b, 0);
  const probs = (z) => pi.map((p) => (Math.sqrt(z * z + 4 * (1 - z) * (p * p) / S) - z) / (2 * (1 - z)));
  const sum = (z) => probs(z).reduce((a, b) => a + b, 0);
  if (S <= 1) return { probabilities: pi.map((p) => p / S), z: 0 }; // no overround: nothing to remove
  let lo = 0, hi = 0.999999;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (sum(mid) > 1) lo = mid; else hi = mid; }
  const z = (lo + hi) / 2;
  return { probabilities: probs(z), z };
}

// Mulberry32, the same generator lib/monte-carlo.js uses, so seeded runs are reproducible.
export function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MC_STEPS = [250, 500, 1000, 2500, 5000, 10000];

// Runs lib/monte-carlo.js at growing iteration counts with one seed: the convergence series.
export function mcConvergence(lambda, mu, seed, steps = MC_STEPS) {
  return steps.map((n) => ({ n, ...runMonteCarloSimulation({ homeLambda: lambda, awayLambda: mu, iterations: n, seed }) }));
}

// Seeded bankroll paths: repeated independent bets at fixed odds and true probability p.
// Strategy 'full' stakes the uncapped full-Kelly fraction; 'capped' uses lib fractionalKelly
// (the chosen fraction, capped at maxBet of bankroll, as the app does).
export function bankrollPaths({ p, odds, fraction, maxBet, bankroll, bets, paths, seed, strategy }) {
  const rng = mulberry32(seed);
  const stake = strategy === 'full'
    ? Math.max(0, fullKelly(p, odds))
    : fractionalKelly(p, odds, fraction, bankroll, maxBet).stake;
  const out = [];
  for (let k = 0; k < paths; k++) {
    let b = bankroll;
    const path = [b];
    for (let i = 0; i < bets; i++) {
      const s = b * stake;
      b += rng() < p ? s * (odds - 1) : -s;
      path.push(b);
    }
    out.push(path);
  }
  return { stake, paths: out };
}

export const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
