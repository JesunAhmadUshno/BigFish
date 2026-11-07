import { useMemo, useState, useEffect, useCallback, useId } from 'react';
import facts from 'virtual:repo-facts';
import { TEAM_ELO, VENUES, TEAM_REGIONS, DIXON_COLES_DEFAULTS, KELLY_DEFAULTS, PHYSIO_CONSTANTS } from '../../lib/constants.js';
import { predictMatch } from '../../lib/dixon-coles.js';
import { shinMethod, balancedBooksMethod, wpoMethod, oddsRatioMethod } from '../../lib/shin-method.js';
import { devigAllMethods } from '../../lib/devig-engine.js';
import { fullKelly, calculateGrowthRate } from '../../lib/kelly-criterion.js';
import { generateDecayCurve, estimateWBGT } from '../../lib/physiometric-agent.js';
import { processMatchResult } from '../../lib/elo-updater.js';
import { textbookShin, mcConvergence, bankrollPaths, median, MC_STEPS } from './model.js';

const REPO = 'https://github.com/JesunAhmadUshno/BigFish';
const blob = (ref) => { const [f, l] = ref.split(':'); return `${REPO}/blob/master/${f}${l ? `#L${l}` : ''}`; };
const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const TEAMS = Object.keys(TEAM_ELO).sort((a, b) => TEAM_ELO[b] - TEAM_ELO[a]);
const REGION_TEAMS = Object.keys(TEAM_REGIONS);
const SEED = 42;
const REF_SHIN = textbookShin([2.1, 3.4, 3.5]);

const SECTIONS = [['top', 'Overview', '◎'], ['predictor', 'Predictor', '▦'], ['montecarlo', 'Monte Carlo', '∿'], ['devig', 'De-vig', '%'], ['kelly', 'Kelly', '$'], ['venues', 'Venues', '▲'], ['elo', 'Elo', '±'], ['audit', 'Claims audit', '✓'], ['reproduce', 'Reproduce', '❯_']];

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.08 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

function MenuBar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  return (
    <div className="menubar" role="banner">
      <span className="apple" aria-hidden="true">◆</span>
      <a className="app" href="#top">BigFish Lab</a>
      <a className="m" href="../">Open the app</a>
      <a className="m" href={blob('docs/research-review.md')}>Research review</a>
      <a className="m" href={blob('README.md')}>README</a>
      <span className="spacer" />
      <span className="status"><i /> Model code runs live</span>
      <a href={REPO}>GitHub ↗</a>
      <span className="clock">{now.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>
    </div>
  );
}

function Dock() {
  const [active, setActive] = useState('top');
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-45% 0px -50% 0px' });
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  return (
    <nav className="dock" aria-label="Sections">
      {SECTIONS.map(([id, label, icon]) => (
        <a key={id} href={`#${id}`} className={active === id ? 'on' : ''} aria-current={active === id ? 'true' : undefined}>
          <span className="ico" aria-hidden="true">{icon}</span><span className="lbl">{label}</span>
        </a>
      ))}
    </nav>
  );
}

function Range({ label, value, min, max, step, onChange, show }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label} <span>{show}</span></label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </div>
  );
}

function Num({ label, value, onChange, min, max, step = 1 }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="number" value={value} min={min} max={max} step={step} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

const teamOptions = TEAMS.map((t) => [t, `${t} (${TEAM_ELO[t]})`]);

export default function App() {
  useReveal();
  const [match, setMatch] = useState({ home: 'Argentina', away: 'France', rho: DIXON_COLES_DEFAULTS.RHO_INITIAL, ha: DIXON_COLES_DEFAULTS.HOME_ADVANTAGE, neutral: false });
  const pred = useMemo(() => predictMatch({ homeElo: TEAM_ELO[match.home], awayElo: TEAM_ELO[match.away], rho: match.rho, homeAdvantage: match.neutral ? 0 : match.ha }), [match]);
  return (
    <div className="wrap">
      <MenuBar />
      <div className="glow" aria-hidden="true" />
      <Hero />
      <Predictor match={match} setMatch={setMatch} pred={pred} />
      <MonteCarlo match={match} pred={pred} />
      <Devig />
      <Kelly />
      <Venues />
      <Elo />
      <Audit />
      <Reproduce />
      <Dock />
      <footer>
        Not betting advice. BigFish has no recorded betting returns. Every number on this page is computed in your browser by the repo’s own <code>lib/</code> code or read from repo files at build time.
      </footer>
    </div>
  );
}

function Hero() {
  return (
    <header className="card hero window" id="top" data-title="BigFish — README">
      <div className="head">
        <p className="eyebrow">2026 World Cup model · live code, no track record</p>
        <span className="pill warn">● {facts.recordedResults} recorded results</span>
      </div>
      <h1>BigFish turns Elo ratings into full scoreline odds, and has <em>not yet recorded</em> a single betting result.</h1>
      <p className="sub">
        BigFish is a Next.js betting terminal for the 2026 World Cup. Under the interface sit plain JavaScript models: a Dixon-Coles scoreline model, four ways to strip the bookmaker margin from odds, Kelly staking, a Monte Carlo match simulator, venue physiology curves and an Elo updater.
        This page runs that exact code in your browser so you can test it, and it says plainly what has not been measured: there is no held-out evaluation, no calibration and no profit record yet.
      </p>
      <div className="actions">
        <a className="btn primary" href="#predictor">Try the match predictor</a>
        <a className="btn ghost" href="#audit">Read the claims audit</a>
        <span className="hint">The product app lives one level up, at <a href="../">/BigFish/</a></span>
      </div>
      <div className="tiles five">
        <div className="tile"><div className="num">{TEAMS.length}</div><div className="cap">teams rated in <span className="mono">TEAM_ELO</span></div></div>
        <div className="tile"><div className="num">{Object.keys(VENUES).length}</div><div className="cap">host venues with altitude and climate</div></div>
        <div className="tile"><div className="num">{facts.libModules}</div><div className="cap">model modules in <span className="mono">lib/</span></div></div>
        <div className="tile"><div className="num">{facts.appRoutes}</div><div className="cap">routes in the Next.js app</div></div>
        <div className="tile"><div className="num">{facts.recordedResults}</div><div className="cap">of {facts.resultRowCount} README result rows have a recorded result</div></div>
      </div>
    </header>
  );
}

function Heatmap({ matrix }) {
  const [hover, setHover] = useState(null);
  const n = matrix.length, cell = 34, padL = 34, padT = 30, W = padL + n * cell + 4, H = padT + n * cell + 4;
  const pmax = Math.max(...matrix.flat());
  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Scoreline probability heatmap, home goals by row and away goals by column" onMouseLeave={() => setHover(null)}>
        <text x={padL + (n * cell) / 2} y={11} textAnchor="middle">away goals →</text>
        {matrix.map((_, j) => <text key={`c${j}`} x={padL + j * cell + cell / 2} y={padT - 6} textAnchor="middle">{j}</text>)}
        {matrix.map((row, i) => (
          <g key={i}>
            <text x={padL - 8} y={padT + i * cell + cell / 2 + 4} textAnchor="end">{i}</text>
            {row.map((p, j) => {
              const a = Math.sqrt(p / pmax);
              return (
                <g key={j} onMouseEnter={() => setHover({ i, j, p })}>
                  <rect x={padL + j * cell + 1} y={padT + i * cell + 1} width={cell - 2} height={cell - 2} rx="4" fill={i > j ? 'var(--primary)' : i === j ? 'var(--warn)' : 'var(--bad)'} fillOpacity={0.06 + 0.9 * a} stroke={hover && hover.i === i && hover.j === j ? 'var(--text)' : 'none'} />
                  {p >= 0.02 && <text x={padL + j * cell + cell / 2} y={padT + i * cell + cell / 2 + 4} textAnchor="middle" style={{ fill: a > 0.6 ? '#fff' : 'var(--text)', fontSize: 10 }}>{(p * 100).toFixed(0)}</text>}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
      <div className="tip" aria-live="polite">{hover ? <>Home {hover.i}, away {hover.j}: {pct(hover.p, 2)}</> : 'Rows are home goals, columns away goals. Labels show % for cells of 2% or more. Hover a cell.'}</div>
      <div className="legend"><span><i style={{ background: 'var(--primary)' }} />home win</span><span><i style={{ background: 'var(--warn)' }} />draw</span><span><i style={{ background: 'var(--bad)' }} />away win</span></div>
    </div>
  );
}

function Bars({ rows, scale = 1 }) {
  return (
    <div className="bars">
      {rows.map((r) => (
        <div className="bar-row" key={r.k}>
          <div className="lab"><span>{r.k}</span><b>{pct(r.v)}</b></div>
          <div className="track"><div className="fill" style={{ width: `${Math.min(100, (r.v / scale) * 100)}%`, background: r.c || 'var(--primary)' }} /></div>
        </div>
      ))}
    </div>
  );
}

function Predictor({ match, setMatch, pred }) {
  const set = (k) => (v) => setMatch((m) => ({ ...m, [k]: v }));
  const { lambda, mu } = pred.parameters;
  const x = pred.probabilities1X2;
  const mass = pred.matrix.flat().reduce((a, b) => a + b, 0);
  const same = match.home === match.away;
  return (
    <section id="predictor" className="card window reveal" data-title="dixon_coles.js — match predictor">
      <div className="head">
        <div>
          <p className="eyebrow">Live · lib/dixon-coles.js</p>
          <h2>Pick two teams and the model prices every scoreline from 0-0 to {DIXON_COLES_DEFAULTS.MAX_GOALS}-{DIXON_COLES_DEFAULTS.MAX_GOALS}.</h2>
          <p className="sub">
            Expected goals come from the Elo gap through a logistic formula, not from fitted attack and defence strengths. The Dixon-Coles correction ρ then reweights the four low-scoring cells.
            The repo applies a home advantage of {DIXON_COLES_DEFAULTS.HOME_ADVANTAGE} even at neutral venues; the toggle below sets it to 0, which is the right choice for most World Cup matches.
          </p>
        </div>
        <span className="pill info">matrix mass {pct(mass, 3)}</span>
      </div>
      <div className="controls">
        <Select label="First-named team" value={match.home} onChange={set('home')} options={teamOptions} />
        <Select label="Second-named team" value={match.away} onChange={set('away')} options={teamOptions} />
        <Range label="Dixon-Coles ρ" value={match.rho} min={-0.3} max={0.1} step={0.01} onChange={set('rho')} show={match.rho.toFixed(2)} />
        <Range label="Home advantage" value={match.neutral ? 0 : match.ha} min={0} max={0.5} step={0.01} onChange={(v) => setMatch((m) => ({ ...m, ha: v, neutral: false }))} show={(match.neutral ? 0 : match.ha).toFixed(2)} />
      </div>
      <div className="actions" style={{ marginTop: 0, marginBottom: 16 }}>
        <div className="seg" role="group" aria-label="Venue">
          <button aria-pressed={!match.neutral} onClick={() => set('neutral')(false)}>Repo default (home edge)</button>
          <button aria-pressed={match.neutral} onClick={() => set('neutral')(true)}>Neutral venue</button>
        </div>
        <span className="hint">xG {lambda.toFixed(2)} vs {mu.toFixed(2)}{same ? ' · same team picked twice' : ''}</span>
      </div>
      <div className="grid2">
        <Heatmap matrix={pred.matrix} />
        <div>
          <h3>Match result</h3>
          <div style={{ marginTop: 12 }}>
            <Bars rows={[{ k: `${match.home} win`, v: x.home, c: 'var(--primary)' }, { k: 'Draw', v: x.draw, c: 'var(--warn)' }, { k: `${match.away} win`, v: x.away, c: 'var(--bad)' }]} />
          </div>
          <h3 style={{ marginTop: 20 }}>Goals markets</h3>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Line</th><th>Over</th><th>Under</th></tr></thead>
              <tbody>
                {[1.5, 2.5, 3.5, 4.5].map((l) => <tr key={l}><td>{l} goals</td><td>{pct(pred.overUnder[l].over)}</td><td>{pct(pred.overUnder[l].under)}</td></tr>)}
                <tr><td>Both teams score</td><td>{pct(pred.btts.yes)}</td><td>{pct(pred.btts.no)}</td></tr>
              </tbody>
            </table>
          </div>
          <h3 style={{ marginTop: 20 }}>Most likely scorelines</h3>
          <p className="hint" style={{ margin: '6px 0 0' }}>{pred.topScorelines.slice(0, 6).map((s) => `${s.home}-${s.away} ${pct(s.probability)}`).join(' · ')}</p>
        </div>
      </div>
    </section>
  );
}

function MonteCarlo({ match, pred }) {
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const { lambda, mu } = pred.parameters;
  const run = useCallback(() => {
    setBusy(true);
    requestAnimationFrame(() => setTimeout(() => {
      const t0 = performance.now();
      const series = mcConvergence(lambda, mu, SEED);
      setRes({ series, ms: performance.now() - t0, lambda, mu, exact: pred.probabilities1X2, label: `${match.home} v ${match.away}` });
      setBusy(false);
    }, 0));
  }, [lambda, mu, pred, match.home, match.away]);
  useEffect(() => { run(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const stale = res && (res.lambda !== lambda || res.mu !== mu);
  const W = 460, H = 240, pad = { l: 40, r: 10, t: 10, b: 26 };
  const lx = (n) => pad.l + (Math.log(n / MC_STEPS[0]) / Math.log(MC_STEPS.at(-1) / MC_STEPS[0])) * (W - pad.l - pad.r);
  const ly = (p) => pad.t + (1 - p) * (H - pad.t - pad.b);
  const keys = [['home', 'var(--primary)'], ['draw', 'var(--warn)'], ['away', 'var(--bad)']];
  const last = res?.series.at(-1);
  return (
    <section id="montecarlo" className="card window reveal" data-title="monte_carlo.js — 10k sims">
      <div className="head">
        <div>
          <p className="eyebrow">Live · lib/monte-carlo.js against the exact matrix</p>
          <h2>The simulator does not converge to the model it is meant to sample.</h2>
          <p className="sub">
            This runs the repo’s seeded minute-by-minute simulator (seed {SEED}) at growing sample sizes, beside the exact Dixon-Coles 1X2 from the predictor above.
            With enough runs the dots should settle on the dashed lines. They settle elsewhere, because the simulator plays 95 minutes at a 90-minute rate, boosts the trailing side after minute 60, and ignores ρ.
            Its file header calls it copula-driven, but the copula functions it imports are never called.
          </p>
        </div>
        <span className="pill info">{res ? `${MC_STEPS.reduce((a, b) => a + b, 0).toLocaleString()} sims in ${res.ms.toFixed(0)} ms` : '…'}</span>
      </div>
      <div className="actions" style={{ marginTop: 0, marginBottom: 16 }}>
        <button className="btn primary" onClick={run} disabled={busy}>{busy ? 'Simulating…' : stale ? 'Re-run for the new match' : 'Re-run simulation'}</button>
        <span className="hint">{res ? `Showing ${res.label}, xG ${res.lambda.toFixed(2)} vs ${res.mu.toFixed(2)}.` : ''}{stale ? ' The predictor changed since this run.' : ''}</span>
      </div>
      {res && (
        <div className="grid2">
          <div>
            <h3>Simulated 1X2 by sample size (dashed: exact)</h3>
            <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Monte Carlo convergence of home, draw and away probabilities against exact Dixon-Coles values">
              {[0, 0.25, 0.5, 0.75, 1].map((t) => <g key={t}><line className="axis" x1={pad.l} x2={W - pad.r} y1={ly(t)} y2={ly(t)} /><text x={pad.l - 6} y={ly(t) + 4} textAnchor="end">{pct(t, 0)}</text></g>)}
              {keys.map(([k, c]) => (
                <g key={k}>
                  <line x1={pad.l} x2={W - pad.r} y1={ly(res.exact[k])} y2={ly(res.exact[k])} stroke={c} strokeDasharray="5 4" opacity="0.8" />
                  <polyline fill="none" stroke={c} strokeWidth="2" points={res.series.map((s) => `${lx(s.n)},${ly(s.probabilities[k])}`).join(' ')} />
                  {res.series.map((s) => <circle key={s.n} cx={lx(s.n)} cy={ly(s.probabilities[k])} r="3.5" fill={c} />)}
                </g>
              ))}
              {MC_STEPS.map((n) => <text key={n} x={lx(n)} y={H - 6} textAnchor="middle">{n >= 1000 ? `${n / 1000}k` : n}</text>)}
            </svg>
          </div>
          <div>
            <h3>At {last.n.toLocaleString()} simulations</h3>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Quantity</th><th>Exact model</th><th>Simulator</th><th>Gap</th></tr></thead>
                <tbody>
                  {keys.map(([k]) => {
                    const gap = last.probabilities[k] - res.exact[k];
                    const se = Math.sqrt(res.exact[k] * (1 - res.exact[k]) / last.n);
                    return <tr key={k}><td>P({k})</td><td>{pct(res.exact[k])}</td><td>{pct(last.probabilities[k])}</td><td className={Math.abs(gap) > 2 * se ? 'no' : 'ok'}>{gap >= 0 ? '+' : ''}{(gap * 100).toFixed(1)} pts</td></tr>;
                  })}
                  <tr><td>Mean total goals</td><td>{(res.lambda + res.mu).toFixed(2)}</td><td>{last.averages.totalGoals.toFixed(2)}</td><td>{(last.averages.totalGoals - res.lambda - res.mu >= 0 ? '+' : '')}{(last.averages.totalGoals - res.lambda - res.mu).toFixed(2)}</td></tr>
                </tbody>
              </table>
            </div>
            <p className="hint">Red gaps exceed two binomial standard errors, so they are bias, not noise. Two simulator outputs with one seed are identical; the build re-checks that.</p>
          </div>
        </div>
      )}
    </section>
  );
}

const METHOD_ROWS = [
  ['Textbook Shin (reference)', (o) => textbookShin(o)],
  ['Repo Shin (shinMethod)', (o) => shinMethod(o)],
  ['Balanced book', (o) => balancedBooksMethod(o)],
  ['WPO', (o) => wpoMethod(o)],
  ['Odds ratio', (o) => oddsRatioMethod(o)],
];

function Devig() {
  const [ways, setWays] = useState(3);
  const [raw, setRaw] = useState(['2.10', '3.40', '3.50']);
  const odds = raw.slice(0, ways).map(Number);
  const valid = odds.every((o) => Number.isFinite(o) && o > 1.01 && o < 1000);
  const labels = ways === 3 ? ['Home', 'Draw', 'Away'] : ['Yes', 'No'];
  const out = useMemo(() => {
    if (!valid) return null;
    const rows = METHOD_ROWS.map(([k, f]) => ({ k, r: f(odds) }));
    const all = devigAllMethods(odds);
    return { rows, consensus: all.consensus, margin: all.margin };
  }, [valid, ...odds]); // eslint-disable-line react-hooks/exhaustive-deps
  const repo = out?.rows[1].r, ref = out?.rows[0].r;
  const degenerate = repo && repo.z > 0.99;
  return (
    <section id="devig" className="card window reveal" data-title="devig_bench">
      <div className="head">
        <div>
          <p className="eyebrow">Live · lib/shin-method.js + lib/devig-engine.js</p>
          <h2>The repo’s recommended de-vig method has a bug you can watch.</h2>
          <p className="sub">
            Bookmaker odds include a margin. De-vig methods remove it to recover fair probabilities. Shin’s method models the margin as protection against insiders, with an insider share z.
            The textbook formula divides πᵢ² by Σπ. The repo divides by Σπ² (<a href={blob(facts.refs.shinBug)}>{facts.refs.shinBug}</a>), so its search for z runs to about 1 and the result is distorted.
            The de-vig engine still marks Shin as recommended (<a href={blob(facts.refs.shinRecommended)}>{facts.refs.shinRecommended}</a>). A one-line fix is ready, waiting on the owner’s go-ahead.
          </p>
        </div>
        {out && <span className={`pill ${degenerate ? 'bad' : 'good'}`}>repo z = {repo.z.toFixed(3)} · textbook z = {ref.z.toFixed(3)}</span>}
      </div>
      <div className="controls">
        <div className="field"><span className="hint" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Market</span>
          <div className="seg" role="group" aria-label="Market type">
            <button aria-pressed={ways === 3} onClick={() => setWays(3)}>1X2 (3-way)</button>
            <button aria-pressed={ways === 2} onClick={() => setWays(2)}>2-way</button>
          </div>
        </div>
        {labels.map((l, i) => <Num key={l} label={`${l} decimal odds`} value={raw[i]} min={1.01} step={0.01} onChange={(v) => setRaw((r) => r.map((x, k) => (k === i ? v : x)))} />)}
      </div>
      {!out ? <p className="hint">Enter decimal odds above 1.01 for every outcome.</p> : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Method</th>{labels.map((l) => <th key={l}>{l}</th>)}<th>Insider share z</th></tr></thead>
              <tbody>
                <tr><td>Raw implied (1/odds)</td>{odds.map((o, i) => <td key={i}>{pct(1 / o)}</td>)}<td>margin {pct(out.margin)}</td></tr>
                {out.rows.map(({ k, r }) => (
                  <tr key={k}><td>{k}</td>{r.probabilities.map((p, i) => <td key={i} className={k.startsWith('Repo') && degenerate ? 'no' : undefined}>{pct(p)}</td>)}<td>{r.z !== undefined ? r.z.toFixed(4) : '–'}</td></tr>
                ))}
                <tr><td>Repo consensus (mean of four)</td>{out.consensus.map((p, i) => <td key={i}>{pct(p)}</td>)}<td>–</td></tr>
              </tbody>
            </table>
          </div>
          <p className="hint">{degenerate
            ? `For these odds the repo’s Shin moves the favourite by ${((repo.probabilities[0] - ref.probabilities[0]) * 100).toFixed(1)} points against the textbook value, and that error also flows into the consensus row.`
            : 'For these odds the repo’s Shin and the textbook agree on z.'} The Python version (<a href={blob(facts.refs.shinPython)}>{facts.refs.shinPython}</a>) uses (πᵢ/Σπ)², which makes Shin collapse to plain normalisation.</p>
        </>
      )}
    </section>
  );
}

function Kelly() {
  const [odds, setOdds] = useState(2.1);
  const [edge, setEdge] = useState(0.05);
  const [fraction, setFraction] = useState(KELLY_DEFAULTS.FRACTION);
  const [seed, setSeed] = useState(7);
  const p = Math.min(0.99, 1 / odds + edge);
  const fstar = fullKelly(p, odds);
  const BETS = 200, PATHS = 40, bank = KELLY_DEFAULTS.INITIAL_BANKROLL;
  const sims = useMemo(() => ['full', 'capped'].map((strategy) => bankrollPaths({ p, odds, fraction, maxBet: KELLY_DEFAULTS.MAX_BET_FRACTION, bankroll: bank, bets: BETS, paths: PATHS, seed, strategy })), [p, odds, fraction, seed, bank]);
  const fmax = Math.min(0.99, Math.max(0.1, fstar * 2.2));
  const curve = useMemo(() => Array.from({ length: 80 }, (_, i) => { const f = (i + 1) / 80 * fmax; return [f, calculateGrowthRate(p, odds, f)]; }), [p, odds, fmax]);
  const gmax = Math.max(...curve.map((c) => c[1]), 0.001), gmin = Math.min(...curve.map((c) => c[1]), -gmax);
  const W = 460, H = 220, pad = { l: 46, r: 10, t: 10, b: 24 };
  const gx = (f) => pad.l + (f / fmax) * (W - pad.l - pad.r);
  const gy = (g) => pad.t + (1 - (g - gmin) / (gmax - gmin)) * (H - pad.t - pad.b);
  const finals = sims.map((s) => s.paths.map((path) => path.at(-1)));
  const all = sims.flatMap((s) => s.paths.flat());
  const lo = Math.log10(Math.max(1, Math.min(...all))), hi = Math.log10(Math.max(...all) * 1.05);
  const px = (i) => pad.l + (i / BETS) * (W - pad.l - pad.r);
  const py = (b) => pad.t + (1 - (Math.log10(Math.max(1, b)) - lo) / (hi - lo || 1)) * (H - pad.t - pad.b);
  const ticks = [10, 100, 1e3, 1e4, 1e5, 1e6, 1e7].filter((t) => Math.log10(t) >= lo && Math.log10(t) <= hi);
  const colors = ['var(--bad)', 'var(--primary)'];
  const capped = sims[1].stake;
  return (
    <section id="kelly" className="card window reveal" data-title="kelly_sim">
      <div className="head">
        <div>
          <p className="eyebrow">Live · lib/kelly-criterion.js · hypothetical edge, not a record</p>
          <h2>Kelly staking only pays if the edge is real, and full Kelly swings hard even when it is.</h2>
          <p className="sub">
            Pick odds and an assumed edge over the implied probability. The growth curve is the repo’s calculateGrowthRate; it peaks at the full-Kelly stake.
            The paths replay {BETS} independent bets for {PATHS} seeded bettors, comparing uncapped full Kelly with the app’s own setting: {pct(KELLY_DEFAULTS.FRACTION, 0)} Kelly capped at {pct(KELLY_DEFAULTS.MAX_BET_FRACTION, 0)} of bankroll.
          </p>
        </div>
        <span className="pill warn">assumed true p = {pct(p)}</span>
      </div>
      <div className="controls">
        <Range label="Decimal odds" value={odds} min={1.2} max={6} step={0.05} onChange={setOdds} show={odds.toFixed(2)} />
        <Range label="Assumed edge (points)" value={edge} min={-0.05} max={0.15} step={0.005} onChange={setEdge} show={`${edge >= 0 ? '+' : ''}${(edge * 100).toFixed(1)}`} />
        <Range label="Kelly fraction" value={fraction} min={0.05} max={1} step={0.05} onChange={setFraction} show={pct(fraction, 0)} />
        <Num label="Seed" value={seed} min={1} onChange={(v) => setSeed(Math.max(1, Math.floor(+v) || 1))} />
      </div>
      <div className="tiles" style={{ marginTop: 0, marginBottom: 16 }}>
        <div className="tile"><div className="num">{fstar > 0 ? pct(fstar) : 'no bet'}</div><div className="cap">full-Kelly stake, (bp − q) / b</div></div>
        <div className="tile"><div className="num">{pct(capped)}</div><div className="cap">app stake: {pct(fraction, 0)} Kelly, capped at {pct(KELLY_DEFAULTS.MAX_BET_FRACTION, 0)}</div></div>
        <div className="tile"><div className="num">{money(median(finals[1]))}</div><div className="cap">median capped bankroll after {BETS} bets (from {money(bank)})</div></div>
        <div className="tile"><div className="num">{pct(finals[0].filter((b) => b < bank).length / PATHS, 0)}</div><div className="cap">of full-Kelly bettors end below their start</div></div>
      </div>
      <div className="grid2">
        <div>
          <h3>Expected log growth per bet by stake</h3>
          <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Kelly growth rate curve by stake fraction">
            <line className="axis" x1={pad.l} x2={W - pad.r} y1={gy(0)} y2={gy(0)} strokeWidth="1.5" />
            <text x={pad.l - 6} y={gy(0) + 4} textAnchor="end">0</text>
            <text x={pad.l - 6} y={gy(gmax) + 4} textAnchor="end">{gmax.toFixed(3)}</text>
            <polyline fill="none" stroke="var(--primary)" strokeWidth="2.5" points={curve.map(([f, g]) => `${gx(f)},${gy(g)}`).join(' ')} />
            {fstar > 0 && fstar <= fmax && <g><line x1={gx(fstar)} x2={gx(fstar)} y1={pad.t} y2={H - pad.b} stroke="var(--bad)" strokeDasharray="4 4" /><text x={gx(fstar) + 4} y={pad.t + 10} style={{ fill: 'var(--bad)' }}>full Kelly</text></g>}
            {capped > 0 && <g><line x1={gx(capped)} x2={gx(capped)} y1={pad.t} y2={H - pad.b} stroke="var(--good)" strokeDasharray="4 4" /><text x={gx(capped) + 4} y={pad.t + 24} style={{ fill: 'var(--good)' }}>app stake</text></g>}
            <text x={pad.l} y={H - 6}>0%</text><text x={W - pad.r} y={H - 6} textAnchor="end">{pct(fmax, 0)} of bankroll</text>
          </svg>
        </div>
        <div>
          <h3>Bankroll paths (log scale)</h3>
          <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Seeded bankroll paths for full Kelly and capped fractional Kelly">
            {ticks.map((t) => <g key={t}><line className="axis" x1={pad.l} x2={W - pad.r} y1={py(t)} y2={py(t)} /><text x={pad.l - 6} y={py(t) + 4} textAnchor="end">{t >= 1e6 ? `${t / 1e6}M` : t >= 1e3 ? `${t / 1e3}k` : t}</text></g>)}
            <line x1={pad.l} x2={W - pad.r} y1={py(bank)} y2={py(bank)} stroke="var(--text)" strokeDasharray="3 3" opacity="0.5" />
            {sims.map((s, k) => s.paths.map((path, i) => <polyline key={`${k}-${i}`} fill="none" stroke={colors[k]} strokeOpacity={0.28} strokeWidth="1" points={path.filter((_, j) => j % 2 === 0).map((b, j) => `${px(j * 2)},${py(b)}`).join(' ')} />))}
            <text x={pad.l} y={H - 6}>bet 0</text><text x={W - pad.r} y={H - 6} textAnchor="end">bet {BETS}</text>
          </svg>
          <div className="legend"><span><i style={{ background: 'var(--bad)' }} />full Kelly (median {money(median(finals[0]))})</span><span><i style={{ background: 'var(--primary)' }} />app setting (median {money(median(finals[1]))})</span></div>
        </div>
      </div>
    </section>
  );
}

function Venues() {
  const venueIds = Object.keys(VENUES);
  const [venueId, setVenueId] = useState('estadio-azteca');
  const [team, setTeam] = useState('England');
  const [hours, setHours] = useState(48);
  const v = VENUES[venueId];
  const defaultWbgt = estimateWBGT(v.avg_summer_temp_c ?? 25, v.avg_summer_humidity ?? 50);
  const [wbgtOverride, setWbgtOverride] = useState(null);
  const wbgt = wbgtOverride ?? defaultWbgt;
  const c = useMemo(() => generateDecayCurve({ teamName: team, venueId, wbgt, hoursSinceArrival: hours }), [team, venueId, wbgt, hours]);
  const W = 720, H = 320, pad = { l: 40, r: 10, t: 10, b: 26 };
  const ymin = 0.5;
  const x = (m) => pad.l + (m / 100) * (W - pad.l - pad.r);
  const y = (e) => pad.t + (1 - (Math.max(ymin, e) - ymin) / (1 - ymin)) * (H - pad.t - pad.b);
  const series = [['efficiency', 'Composite', 'var(--text)', 2.5], ['hypoxicFactor', 'Altitude', 'var(--primary)', 1.5], ['thermalFactor', 'Heat', 'var(--bad)', 1.5], ['circadianFactor', 'Jet lag', 'var(--warn)', 1.5]];
  return (
    <section id="venues" className="card window reveal" data-title="physiometric_agent — venues">
      <div className="head">
        <div>
          <p className="eyebrow">Live · lib/physiometric-agent.js · unsourced assumptions</p>
          <h2>How the model thinks altitude, heat and jet lag wear a team down over 90 minutes.</h2>
          <p className="sub">
            Each curve is a multiplier on a team’s scoring rate, minute by minute. The constants behind them, such as {pct(PHYSIO_CONSTANTS.HYPOXIC_DECAY_PER_1000M)} per 1,000 m above {PHYSIO_CONSTANTS.HYPOXIC_THRESHOLD_M.toLocaleString()} m and {pct(PHYSIO_CONSTANTS.CIRCADIAN_PENALTY_PER_TZ)} per time zone, carry no citation in the repo (<a href={blob(facts.refs.physio)}>{facts.refs.physio}</a>).
            Treat these curves as the model’s assumptions, not measured physiology.
          </p>
        </div>
        <span className="pill info">{v.altitude_m.toLocaleString()} m · WBGT {wbgt}°C · {c.timezonesCrossed} time zones</span>
      </div>
      <div className="controls">
        <Select label="Venue" value={venueId} onChange={(id) => { setVenueId(id); setWbgtOverride(null); }} options={venueIds.map((id) => [id, `${VENUES[id].name}, ${VENUES[id].city}`])} />
        <Select label="Team (home base)" value={team} onChange={setTeam} options={REGION_TEAMS.map((t) => [t, `${t} (${TEAM_REGIONS[t].base_altitude} m)`])} />
        <Range label="WBGT heat index" value={wbgt} min={18} max={38} step={0.5} onChange={setWbgtOverride} show={`${wbgt}°C`} />
        <Range label="Hours since arrival" value={hours} min={0} max={168} step={6} onChange={setHours} show={`${hours} h`} />
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Efficiency multipliers by match minute for altitude, heat, jet lag and their product">
        {[0.5, 0.6, 0.7, 0.8, 0.9, 1].map((t) => <g key={t}><line className="axis" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} /><text x={pad.l - 6} y={y(t) + 4} textAnchor="end">{t.toFixed(1)}</text></g>)}
        {[0, 15, 30, 45, 60, 75, 90].map((m) => <text key={m} x={x(m)} y={H - 6} textAnchor="middle">{m}′</text>)}
        {series.map(([k, , col, w]) => <polyline key={k} fill="none" stroke={col} strokeWidth={w} points={c.curve.map((pt) => `${x(pt.minute)},${y(pt[k])}`).join(' ')} />)}
      </svg>
      <div className="legend">{series.map(([k, l, col]) => <span key={k}><i style={{ background: col }} />{l}</span>)}</div>
      <p className="hint">Match average {c.avgEfficiency.toFixed(3)} · first half {c.summary.first_half_avg.toFixed(3)} · second half {c.summary.second_half_avg.toFixed(3)} · lowest {c.summary.minimum.toFixed(3)}. Default WBGT is estimated from the venue’s listed summer temperature ({v.avg_summer_temp_c}°C) and humidity ({v.avg_summer_humidity}%).</p>
    </section>
  );
}

function Elo() {
  const [home, setHome] = useState('Argentina');
  const [away, setAway] = useState('Iraq');
  const [hs, setHs] = useState('0');
  const [as, setAs] = useState('1');
  const h = Math.max(0, Math.min(20, Math.floor(+hs) || 0)), a = Math.max(0, Math.min(20, Math.floor(+as) || 0));
  const r = processMatchResult(TEAM_ELO[home], TEAM_ELO[away], h, a);
  const dAway = r.awayEloNew - TEAM_ELO[away];
  return (
    <section id="elo" className="card window reveal" data-title="elo_updater">
      <p className="eyebrow">Live · lib/elo-updater.js</p>
      <h2>Enter a score and see how far each rating moves.</h2>
      <p className="sub">
        The updater compares the result with the Elo expectation, multiplies by K = 40 and a goal-difference weight, and rounds. Upsets move ratings most.
        These ratings feed the predictor above, so a single update changes every scoreline probability.
      </p>
      <div className="controls" style={{ marginTop: 16 }}>
        <Select label="Home team" value={home} onChange={setHome} options={teamOptions} />
        <Num label={`${home} goals`} value={hs} min={0} max={20} onChange={setHs} />
        <Num label={`${away} goals`} value={as} min={0} max={20} onChange={setAs} />
        <Select label="Away team" value={away} onChange={setAway} options={teamOptions} />
      </div>
      <div className="tiles">
        <div className="tile"><div className="num">{pct(r.expected.home, 0)}</div><div className="cap">{home}’s expected score before the match</div></div>
        <div className="tile"><div className="num" style={{ color: r.eloChange >= 0 ? 'var(--good)' : 'var(--bad)' }}>{r.eloChange >= 0 ? '+' : ''}{r.eloChange}</div><div className="cap">{home}: {TEAM_ELO[home]} → {r.homeEloNew}</div></div>
        <div className="tile"><div className="num" style={{ color: dAway >= 0 ? 'var(--good)' : 'var(--bad)' }}>{dAway >= 0 ? '+' : ''}{dAway}</div><div className="cap">{away}: {TEAM_ELO[away]} → {r.awayEloNew}</div></div>
        <div className="tile"><div className="num">{Math.abs(h - a) <= 1 ? '1.0' : Math.abs(h - a) === 2 ? '1.5' : (1 + (Math.abs(h - a) - 1) * 0.5).toFixed(1)}×</div><div className="cap">goal-difference weight for a {Math.abs(h - a)}-goal margin</div></div>
      </div>
    </section>
  );
}

function Audit() {
  const R = facts.refs;
  const rows = [
    ['Betting results', `${facts.resultRowCount} rows in the README results table, ${facts.recordedResults} with a recorded result.`, R.resultsTable, 'No record', 'warn'],
    ['Backtest Sharpe, ROI, drawdown', 'Were fixed strings, never computed, shown as backtest output. Now shown as “not computed”.', R.backtestNotComputed, 'Corrected here', 'good'],
    ['Trade confirmations', 'The execution agent logged “Tx Confirmed” with a random block number and sent nothing. Now labelled simulated.', R.execSimulated, 'Corrected here', 'good'],
    ['Neural model accuracy', `${facts.nn.params.toLocaleString()} parameters, ${facts.nn.epochs} epochs on matches fetched at run time, ${facts.nn.hasValidation ? 'with' : 'no'} validation split. Accuracy shown is training-set accuracy.`, facts.nn.fitAt, 'Unmeasured', 'warn'],
    ['Shin de-vig “recommended”', 'Wrong normaliser drives z to about 1 (see the bench above). Python copy collapses to plain normalisation.', R.shinBug, 'Bug, fix pending', 'bad'],
    ['Dixon-Coles model', 'xG comes from an Elo-logistic heuristic; ρ is fixed. The Python maximum-likelihood fit only ever runs on synthetic random matches.', R.expectedGoals, 'Not fitted', 'warn'],
    ['Copula Monte Carlo', 'Copula functions are imported but never called; the simulator is an independent minute-by-minute process that overshoots the model’s goals.', R.mcCopulaImport, 'Mislabelled', 'warn'],
    ['Team Elo and physiology constants', 'No source or snapshot date in the repo. Now marked as unsourced in the code.', R.teamElo, 'Unsourced', 'warn'],
  ];
  return (
    <section id="audit" className="card window reveal" data-title="claims_audit.md">
      <p className="eyebrow">Claims audit · from repo text, with file:line links</p>
      <h2>What the app says, against what the repo can back up.</h2>
      <p className="sub">The README calls BigFish institutional-grade. The evidence in the repo is code, not outcomes: nothing here has been scored against real results or closing odds. Line numbers are found by search at build time, so they cannot go stale silently.</p>
      <div style={{ overflowX: 'auto', marginTop: 16 }}>
        <table>
          <thead><tr><th>Claim or display</th><th>What the repo shows</th><th>Where</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map(([c, d, ref, s, tone]) => (
              <tr key={c}><td><b>{c}</b></td><td>{d}</td><td><a className="mono" href={blob(ref)}>{ref}</a></td><td><span className={`pill ${tone}`}>{s}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint" style={{ marginTop: 12 }}>The neural backtest (TensorFlow.js plus a live TheSportsDB fetch) is not reproduced on this page: it needs a network call and trains a different model every run.</p>
    </section>
  );
}

function Reproduce() {
  const docs = [
    ['docs/research-review.md', 'Research review', 'Graded gaps and what each needs'],
    ['README.md', 'README', 'App overview and results table'],
    ['lib/dixon-coles.js', 'dixon-coles.js', 'Scoreline model'],
    ['lib/shin-method.js', 'shin-method.js', 'De-vig methods'],
    ['site/src/model.check.mjs', 'model.check.mjs', 'Known-answer self-check'],
    ['test/lib.smoke.test.mjs', 'Smoke tests', 'npm test, built-in runner'],
  ];
  return (
    <section id="reproduce" className="card window reveal" data-title="Terminal — npm run build">
      <p className="eyebrow">Reproduce it</p>
      <h2>Two commands: one for the app, one for this page.</h2>
      <ol className="steps" style={{ marginTop: 16 }}>
        <li><span className="n">1</span><div><b>Run the app</b><div className="hint"><code>git clone {REPO}.git && cd BigFish && npm install && npm run dev</code></div></div></li>
        <li><span className="n">2</span><div><b>Test the model code</b><div className="hint"><code>npm test</code></div></div></li>
        <li><span className="n">3</span><div><b>Build this dashboard</b><div className="hint"><code>cd site && npm ci && npm run build</code> runs <span className="mono">src/model.check.mjs</span> first, which re-derives the Dixon-Coles matrix, the textbook Shin answer ({REF_SHIN.probabilities.map((x) => x.toFixed(3)).join(' / ')} for 2.10 / 3.40 / 3.50), Kelly and Elo values from the repo code and stops the build if any drift.</div></div></li>
      </ol>
      <div className="docs" style={{ marginTop: 20 }}>
        {docs.map(([p, t, d]) => <a key={p} href={blob(p)}><b>{t}</b><small>{d}</small></a>)}
      </div>
    </section>
  );
}
