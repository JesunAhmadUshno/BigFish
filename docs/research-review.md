# BigFish research review

A review of BigFish as if it were submitted as applied research: does the evidence in the repo support the claims made about it? BigFish is a product app (a Next.js betting terminal), so engineering rigor is graded too. Grades: **Pass**, **Partial**, **Fail**.

Scope: the JavaScript models in `lib/`, the Python reference set in `files/`, the app in `app/`, and the README. Every finding cites a file; the live dashboard (`site/`, served at `/BigFish/lab/`) recomputes the numbers below from the same code, and `site/src/model.check.mjs` asserts them on every build.

## Summary

BigFish is a well-organised set of textbook betting models wired into a polished UI. It is not yet research: there is no stated question, no evaluation on real outcomes and no recorded result. The README's own results table has 2 rows and 0 recorded results. Two displays in the app presented made-up numbers as results; both are corrected on this branch. One core method (Shin de-vig) has a formula bug that the app marks as its recommended method.

| Criterion | Grade | One-line reason |
| :--- | :--- | :--- |
| Research question | Fail | None stated; the README describes features, not a question. |
| Hypotheses | Fail | No falsifiable claim, such as "beats closing odds on log-loss". |
| Method | Partial | Standard models (Dixon-Coles, Shin, Kelly, Elo), but Dixon-Coles is not fitted and Shin is wrong. |
| Baselines | Fail | No comparison with market odds, plain Elo, or a base-rate model. |
| Statistics and uncertainty | Fail | No Brier score, log-loss, calibration or interval anywhere. |
| Reproducibility | Partial | JS models are pure and seeded; the neural backtest depends on a live API and is not seeded. |
| Threats to validity | Fail | None discussed in the repo (now listed below and on the dashboard). |
| Related work | Fail | Methods are named but not cited (now listed below). |
| Limitations | Partial | The README results table is honest about having no record; the rest of the README overclaims. |
| Engineering rigor | Partial | Clean modules; no tests before this branch, a committed API key, a duplicate `files.zip`. |

## Findings

1. **No recorded results.** `README.md` "Results, on the record": every Result cell is `TBD-NO-RECORD`. There is no held-out evaluation, no calibration and no comparison with closing odds, so no predictive or profit claim is supported.
2. **Made-up metrics in the product (fixed on this branch).** `app/backtest/page.js` displayed a fixed Sharpe ratio, ROI and drawdown as backtest output, and a win-rate fallback read from a stale state closure. They now read "not computed", and the accuracy tile is labelled as training-set accuracy.
3. **Simulated execution shown as real (fixed on this branch).** `lib/execution-agent.js` logged "Tx Confirmed! Block:" with a random block number and sent nothing, while the README said "The Auto-Pilot is not a mockup" and "deploys real capital". The log line and the README now say execution is simulated.
4. **Shin's method is wrong (fix ready, not applied).** `lib/shin-method.js` normalises πᵢ² by Σπⱼ² instead of Σπⱼ. The search for the insider share z then runs to about 1, and for odds 2.10 / 3.40 / 3.50 the home probability comes out 0.574 against the textbook 0.456 (z = 0.028). `lib/devig-engine.js` marks Shin as `recommended: true`, and the error flows into the consensus. The Python copy (`files/devig_agent.py`) uses (qᵢ/Σq)², which makes Shin collapse to plain normalisation. The fix is one line in each file (use `pi * pi / sumImplied` in JS and `qi**2 / total` in Python, solve z by bisection on Σp = 1); the dashboard's textbook reference (`site/src/model.js` `textbookShin`) is the red-then-green test. It changes a shared engine's output, so it waits for the owner's go-ahead.
5. **Dixon-Coles is not fitted.** `calculateExpectedGoals` in `lib/dixon-coles.js` derives λ and μ from the Elo gap with a logistic heuristic; ρ is fixed at −0.13. The Python maximum-likelihood fit (`files/quantitative_agent.py`) only ever runs on synthetic matches from `np.random` (`files/main_loop.py`, `get_sample_matches`).
6. **Home advantage at neutral venues (partly fixed).** `HOME_ADVANTAGE` 0.26 was commented "log-scale" but is applied linearly, and `predictMatch` applied it to every match, including neutral World Cup venues. `predictMatch` now takes `homeAdvantage` (default unchanged), the comment is corrected, and the dashboard offers a neutral toggle. Whether the app should default to 0 is a product decision.
7. **The "copula" Monte Carlo does not use the copula, and does not sample the model.** `lib/monte-carlo.js` imports `generateCorrelatedSamples`, `inversePoissonCDF` and `buildCorrelationMatrix` but never calls them. It simulates 95 minutes at a per-minute rate of λ/90, boosts the trailing side after minute 60 and ignores ρ, so its 1X2 and mean goals sit away from the exact Dixon-Coles matrix it is meant to approximate (the dashboard shows the gap; it is several binomial standard errors at 10,000 runs).
8. **Neural model: training accuracy only.** `lib/neural-engine.js` trains 4,579 parameters (8 inputs, dense 32-64-32-3) for 50 epochs with no validation split on matches fetched live, and the app shows the final training accuracy.
9. **Unsourced constants (labelled on this branch).** `TEAM_ELO` has no source or snapshot date; `PHYSIO_CONSTANTS` and `SGP_TYPICAL_HOUSE_EDGE` have no citation. Comments now say so instead of inventing sources.
10. **Elo goal-difference weight.** `lib/elo-updater.js` calls its multiplier "FIFA standard". It gives 2.0 for a three-goal margin; the World Football Elo Ratings rule gives (11 + N) / 8 = 1.75. Worth either citing a source or aligning.
11. **Overclaiming language.** "Institutional-grade", "God-Level" and "hyper-accurate" in the README are not supported by any measured result. Left for the owner to reword; the dashboard does not repeat them as claims.
12. **Hygiene.** The TheSportsDB key was hardcoded in `lib/thesportsdb.js`; it now reads `NEXT_PUBLIC_THESPORTSDB_KEY` with the public free-tier fallback. The old key remains in git history, so rotating it is the owner's call. `files.zip` duplicates `files/`; `AGENTS.md`/`CLAUDE.md` scaffolding is committed. Both left in place (not created on this branch).

## Fixed on this branch (cheap upgrades)

- Known-answer check `site/src/model.check.mjs`, run by `npm run build` in `site/`: independent re-implementation of the Dixon-Coles matrix, the Elo-logistic xG, textbook Shin on 2.10 / 3.40 / 3.50, balanced-book normalisation, seeded Monte Carlo determinism, Kelly f* = (bp − q)/b, and the Elo K = 40 update.
- Repo smoke tests: `npm test` (`test/lib.smoke.test.mjs`, built-in `node:test`, 8 tests, no new dependencies).
- Backtest page no longer shows hardcoded Sharpe, ROI and drawdown; `finalMetrics` declared.
- Execution log and README say execution is simulated.
- `predictMatch` neutral-venue option; corrected home-advantage comment; unsourced constants labelled.
- API key moved to an environment variable.
- Live dashboard with a claims audit whose file:line references are found by search at build time.

## Remaining gaps and exactly what each needs

| Gap | What closes it | Data needed | Compute |
| :--- | :--- | :--- | :--- |
| No evaluation of the 1X2 model | Walk-forward test: for each past international match, predict from Elo known before kick-off; report log-loss, Brier score and a reliability diagram with bootstrap intervals | Dated international results (for example the public "International football results from 1872" dataset on Kaggle) and dated pre-match Elo (eloratings.net history, or recompute Elo from the results with `lib/elo-updater.js`) | Minutes on a laptop CPU |
| No market baseline | Compare model log-loss with de-vigged closing odds on the same matches; report the difference with a paired bootstrap CI | Closing 1X2 odds for those matches. Club leagues: football-data.co.uk CSVs (free). Internationals: a licensed odds archive (paid, owner decision) | Minutes |
| No profit record | Paper-trade log: timestamped bet, odds taken, closing odds, stake, result; report closing-line value and ROI with intervals | Prospective odds snapshots during a tournament (the app's odds API key) | Negligible; needs calendar time |
| Dixon-Coles not fitted | Fit attack, defence, home and ρ by time-weighted maximum likelihood (the existing Python code) on real results; compare against the Elo heuristic on the walk-forward test | Same results dataset as row 1 | Minutes |
| Shin bug | Apply the one-line fix in JS and Python; flip the check to assert the repo matches the textbook | None | None (owner's go-ahead) |
| Monte Carlo bias | Simulate 90 minutes, drop the game-state boosts or make them a fitted parameter, and test convergence to the exact matrix | None | Seconds |
| Neural model | Add a validation split or walk-forward split, seed it, report out-of-sample log-loss beside the Dixon-Coles model | Same results dataset | Minutes on CPU (4.6k parameters) |
| Physiology constants | Cite sources for altitude, heat and jet-lag effects, or fit them as parameters and test whether they improve log-loss | Literature review; venue-tagged results | Minutes |
| TEAM_ELO provenance | Record source and snapshot date, or regenerate from the results dataset | Same results dataset | Seconds |

## Threats to validity (for any future evaluation)

- **Look-ahead bias:** ratings, constants or squads taken from after the match date.
- **Selection:** evaluating only on the 48 teams in `TEAM_ELO` or only on matches where odds exist.
- **Market efficiency:** closing odds are a strong baseline; beating opening odds is not evidence of an edge.
- **Small samples:** a World Cup has 104 matches; profit intervals over one tournament will be wide.
- **Multiple comparisons:** four de-vig methods, several Kelly fractions and many markets give many chances to find a lucky winner.

## Related work

- Dixon, M. J. and Coles, S. G. (1997). Modelling association football scores and inefficiencies in the football betting market. *Journal of the Royal Statistical Society, Series C (Applied Statistics)*, 46(2).
- Shin, H. S. (1993). Measuring the incidence of insider trading in a market for state-contingent claims. *The Economic Journal*, 103.
- Jullien, B. and Salanié, B. (1994). Measuring the incidence of insider trading: a comment on Shin. *The Economic Journal*, 104.
- Štrumbelj, E. (2014). On determining probability forecasts from betting odds. *International Journal of Forecasting*, 30(4).
- Kelly, J. L. (1956). A new interpretation of information rate. *Bell System Technical Journal*, 35(4).
- Hvattum, L. M. and Arntzen, H. (2010). Using ELO ratings for match result prediction in association football. *International Journal of Forecasting*, 26(3).

## Limitations of this review

It reads code and runs the pure models; it does not run the Next.js app against live APIs, train the neural model, or test the in-play loop. Not betting advice.
