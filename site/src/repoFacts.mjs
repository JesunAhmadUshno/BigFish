// Reads facts about the repo from disk at build time (Node only).
// Vite exposes the result as `virtual:repo-facts`; model.check.mjs asserts on it.
// Every file:line reference is found by searching for a needle, so a stale reference fails the build.
import fs from 'node:fs';
import path from 'node:path';

export function readRepoFacts(root) {
  const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
  const line = (f, needle) => {
    const i = read(f).split('\n').findIndex((l) => l.includes(needle));
    if (i < 0) throw new Error(`repo fact: "${needle}" not found in ${f}`);
    return `${f}:${i + 1}`;
  };
  const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

  const libModules = fs.readdirSync(path.join(root, 'lib')).filter((f) => f.endsWith('.js')).length;
  const appRoutes = walk('app').filter((f) => path.basename(f) === 'page.js').length;

  // README "Results, on the record" table: rows after the header separator until a blank line.
  const readme = read('README.md').split('\n');
  const start = readme.findIndex((l) => l.startsWith('## Results, on the record'));
  const table = readme.slice(start).filter((l) => l.startsWith('| ') && !l.startsWith('| Date') && !l.startsWith('| :'));
  const resultRows = table.map((l) => l.split('|').map((c) => c.trim()).filter(Boolean));
  const recordedResults = resultRows.filter((c) => c[c.length - 1] !== 'TBD-NO-RECORD').length;

  // Neural net size, parsed from the dense layers in lib/neural-engine.js.
  const nn = read('lib/neural-engine.js');
  const units = [...nn.matchAll(/dense\(\{\s*units:\s*(\d+)/g)].map((m) => +m[1]);
  const inputs = +nn.match(/inputShape:\s*\[(\d+)\]/)[1];
  let prev = inputs, nnParams = 0;
  for (const u of units) { nnParams += prev * u + u; prev = u; }
  const nnEpochs = +nn.match(/epochs:\s*(\d+)/)[1];
  const nnHasValidation = /validationSplit|validationData/.test(nn);

  return {
    libModules, appRoutes, recordedResults, resultRowCount: resultRows.length,
    nn: { inputs, units, params: nnParams, epochs: nnEpochs, hasValidation: nnHasValidation, fitAt: line('lib/neural-engine.js', 'model.fit(') },
    refs: {
      shinBug: line('lib/shin-method.js', 'pi * pi / sumSquared'),
      shinRecommended: line('lib/devig-engine.js', 'recommended: true'),
      shinPython: line('files/devig_agent.py', '(qi / total)**2'),
      homeAdvantage: line('lib/constants.js', 'HOME_ADVANTAGE:'),
      expectedGoals: line('lib/dixon-coles.js', 'const lambda = leagueAvgGoals'),
      teamElo: line('lib/constants.js', 'export const TEAM_ELO'),
      physio: line('lib/constants.js', 'export const PHYSIO_CONSTANTS'),
      mcMinutes: line('lib/monte-carlo.js', 'for (let minute = 1; minute <= 95; minute++)'),
      mcCopulaImport: line('lib/monte-carlo.js', "from './copula.js'"),
      pythonSynthetic: line('files/main_loop.py', 'np.random.seed(42)'),
      backtestNotComputed: line('app/backtest/page.js', "sharpeRatio: 'not computed'"),
      execSimulated: line('lib/execution-agent.js', 'SIMULATED confirmation'),
      resultsTable: line('README.md', '## Results, on the record'),
    },
  };
}
