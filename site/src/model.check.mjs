// Known-answer check, run before every `npm run build`. It reproduces the page's numbers from
// the repo code in Node and fails the build if any of them drift.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { predictMatch, generateScorelineMatrix, derive1X2 } from '../../lib/dixon-coles.js';
import { shinMethod, balancedBooksMethod } from '../../lib/shin-method.js';
import { fullKelly, calculateGrowthRate } from '../../lib/kelly-criterion.js';
import { processMatchResult } from '../../lib/elo-updater.js';
import { runMonteCarloSimulation } from '../../lib/monte-carlo.js';
import { TEAM_ELO, VENUES, DIXON_COLES_DEFAULTS } from '../../lib/constants.js';
import { textbookShin, bankrollPaths } from './model.js';
import { readRepoFacts } from './repoFacts.mjs';

const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b} (tol ${tol})`);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

// 1. Dixon-Coles: an independent re-implementation of tau x Poisson x Poisson must match lib.
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
const pois = (k, l) => Math.exp(-l) * l ** k / fact(k);
const tau = (x, y, l, m, r) => (x === 0 && y === 0 ? 1 - l * m * r : x === 0 && y === 1 ? 1 + l * r : x === 1 && y === 0 ? 1 + m * r : x === 1 && y === 1 ? 1 - r : 1);
const pm = predictMatch({ homeElo: TEAM_ELO.Argentina, awayElo: TEAM_ELO.France });
const { lambda, mu, rho } = pm.parameters;
for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) near(pm.matrix[i][j], tau(i, j, lambda, mu, rho) * pois(i, lambda) * pois(j, mu), 1e-12, `matrix[${i}][${j}]`);
const mass = sum(pm.matrix.flat());
assert.ok(mass > 0.999, `matrix mass ${mass}`);
const x = pm.probabilities1X2;
near(x.home + x.draw + x.away, 1, 1e-12, '1X2 sum');
// Elo-logistic xG, by hand: E = 1/(1+10^(-95/400)); lambda = 1.35 * 1.26 * E/0.5; mu = 1.35 * 0.87 * (1-E)/0.5
const E = 1 / (1 + 10 ** (-(TEAM_ELO.Argentina - TEAM_ELO.France) / 400));
near(lambda, 1.35 * (1 + DIXON_COLES_DEFAULTS.HOME_ADVANTAGE) * E / 0.5, 1e-12, 'lambda');
near(mu, 1.35 * (1 - DIXON_COLES_DEFAULTS.HOME_ADVANTAGE / 2) * (1 - E) / 0.5, 1e-12, 'mu');
const neutral = predictMatch({ homeElo: 1900, awayElo: 1900, homeAdvantage: 0 });
near(neutral.probabilities1X2.home, neutral.probabilities1X2.away, 1e-12, 'neutral symmetry');
const ou25 = pm.overUnder[2.5].over;
near(ou25, sum(pm.matrix.flatMap((r, i) => r.filter((_, j) => i + j > 2.5))), 1e-12, 'O2.5');

// 2. De-vig: textbook Shin on 2.10 / 3.40 / 3.50.
const odds = [2.1, 3.4, 3.5];
const ts = textbookShin(odds);
near(sum(ts.probabilities), 1, 1e-9, 'textbook Shin sum');
[0.456, 0.276, 0.268].forEach((v, i) => near(ts.probabilities[i], v, 0.001, `textbook Shin p${i}`));
near(ts.z, 0.028, 0.001, 'textbook Shin z');
const fair = textbookShin([2, 2]);
near(fair.probabilities[0], 0.5, 1e-9, 'Shin on fair odds');
const inv = odds.map((o) => 1 / o);
balancedBooksMethod(odds).probabilities.forEach((p, i) => near(p, inv[i] / sum(inv), 1e-12, 'balanced = normalized'));
const repo = shinMethod(odds);

// 3. Monte Carlo: seeded runs are reproducible and sum to 1.
const mcA = runMonteCarloSimulation({ homeLambda: lambda, awayLambda: mu, iterations: 10000, seed: 42 });
const mcB = runMonteCarloSimulation({ homeLambda: lambda, awayLambda: mu, iterations: 10000, seed: 42 });
assert.deepEqual(mcA.probabilities, mcB.probabilities, 'MC determinism');
near(sum(Object.values(mcA.probabilities)), 1, 1e-12, 'MC sum');

// 4. Kelly: f* = (bp - q) / b and the growth curve peaks there.
const kp = 0.55, ko = 2.1, kb = ko - 1;
const fstar = fullKelly(kp, ko);
near(fstar, (kb * kp - (1 - kp)) / kb, 1e-12, 'Kelly f*');
assert.ok(calculateGrowthRate(kp, ko, fstar) > calculateGrowthRate(kp, ko, fstar * 0.9) && calculateGrowthRate(kp, ko, fstar) > calculateGrowthRate(kp, ko, fstar * 1.1), 'growth peaks at f*');
const bp = bankrollPaths({ p: kp, odds: ko, fraction: 0.25, maxBet: 0.05, bankroll: 5000, bets: 10, paths: 3, seed: 1, strategy: 'capped' });
assert.equal(bp.stake, Math.min(0.05, fstar * 0.25), 'capped stake');

// 5. Elo: equal ratings, 1-0 home win, K = 40, G = 1 gives +20 / -20.
const elo = processMatchResult(1900, 1900, 1, 0);
assert.equal(elo.eloChange, 20);
assert.equal(elo.awayEloNew, 1880);

// 6. Repo facts read at build time.
const facts = readRepoFacts(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'));
assert.ok(facts.libModules > 0 && facts.appRoutes > 0 && facts.resultRowCount > 0);
assert.equal(facts.nn.params, facts.nn.units.reduce((acc, u, i, a) => acc + (i ? a[i - 1] : facts.nn.inputs) * u + u, 0));

console.log(JSON.stringify({
  ok: true,
  teams: Object.keys(TEAM_ELO).length, venues: Object.keys(VENUES).length,
  argentinaFrance: { lambda: +lambda.toFixed(3), mu: +mu.toFixed(3), home: +x.home.toFixed(3), draw: +x.draw.toFixed(3), away: +x.away.toFixed(3), mass: +mass.toFixed(6) },
  shin: { textbook: ts.probabilities.map((p) => +p.toFixed(3)), z: +ts.z.toFixed(4), repo: repo.probabilities.map((p) => +p.toFixed(3)), repoZ: +repo.z.toFixed(4) },
  monteCarlo10k: { ...mcA.probabilities, meanGoals: +mcA.averages.totalGoals.toFixed(3), exactMeanGoals: +(lambda + mu).toFixed(3) },
  facts: { libModules: facts.libModules, appRoutes: facts.appRoutes, recordedResults: facts.recordedResults, nnParams: facts.nn.params, nnValidation: facts.nn.hasValidation },
}));
