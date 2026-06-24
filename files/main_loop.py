"""
Main Orchestration Loop
========================
Ties all agents together in sequence:

  1. PhysiometricAgent   → environmental decay curves
  2. SentimentAgent      → team psychological state
  3. QuantitativeAgent   → Dixon-Coles xG parameters (adjusted)
  4. MonteCarloAgent     → joint probability simulation
  5. DevigAgent          → true probability extraction
  6. KellyManager        → stake sizing

Usage:
  python main_loop.py
"""

from __future__ import annotations
import json
import sys

from agents.physiometric_agent import (
    PhysiometricAgent, EnvironmentalPayload, BiologicalPayload
)
from agents.quantitative_agent import (
    QuantitativeAgent, MatchRecord, InjuryEvent
)
from agents.monte_carlo_agent import (
    MonteCarloAgent, SimulationConfig, PropDefinition
)
from agents.devig_agent import DevigAgent, OddsPayload
from agents.sentiment_agent import SentimentAgent, TextInput
from models.kelly_criterion import KellyManager, BetProposal

import numpy as np


# ─────────────────────────────────────────────
# Sample Data (replace with live feeds)
# ─────────────────────────────────────────────

def get_sample_matches() -> list[MatchRecord]:
    """Generate synthetic historical match data for demo."""
    np.random.seed(42)
    teams = ["Brazil", "France", "Argentina", "Germany",
             "Spain", "England", "Scotland", "Mexico"]
    matches = []
    for _ in range(300):
        h, a = np.random.choice(teams, size=2, replace=False)
        matches.append(MatchRecord(
            home_team     = h,
            away_team     = a,
            home_goals    = int(np.random.poisson(1.5)),
            away_goals    = int(np.random.poisson(1.1)),
            date_days_ago = int(np.random.randint(1, 500)),
        ))
    return matches


def run_pipeline(
    home_team:   str,
    away_team:   str,
    venue_name:  str,
    altitude_m:  float,
    wbgt:        float,
    home_tz:     int,
    away_tz:     int,
    bankroll:    float = 10_000.0,
):
    """Run the full analytics pipeline for a single match."""

    DIVIDER = "═" * 70

    print(f"\n{DIVIDER}")
    print(f"  FOOTBALL ANALYTICS PIPELINE")
    print(f"  {home_team} vs {away_team}  |  {venue_name}")
    print(f"{DIVIDER}\n")

    # ── Step 1: Physiometric Analysis ──────────────────────────────
    print("▶ STEP 1 — Physiometric & Environmental Analysis")

    env = EnvironmentalPayload(
        venue_name   = venue_name,
        altitude_m   = altitude_m,
        wbgt_celsius = wbgt,
        humidity_pct = 60.0,
        wind_kph     = 10.0,
        utci_celsius = wbgt + 5.0,
    )

    home_bio = BiologicalPayload(
        team_name             = home_team,
        time_zones_crossed    = home_tz,
        hours_since_last_match= 120,
        baseline_vo2max       = 62.0,
        altitude_acclimatised = altitude_m > 1500 and home_tz == 0,
        injury_risk_index     = 0.35,
        is_away_team          = False,
    )

    away_bio = BiologicalPayload(
        team_name             = away_team,
        time_zones_crossed    = away_tz,
        hours_since_last_match= 96,
        baseline_vo2max       = 61.5,
        altitude_acclimatised = False,
        injury_risk_index     = 0.50,
        is_away_team          = True,
    )

    physio_agent   = PhysiometricAgent(verbose=True)
    physio_outputs = physio_agent.analyse(env, home_bio, away_bio)

    # ── Step 2: Sentiment Analysis ──────────────────────────────────
    print("▶ STEP 2 — Sentiment & Press Conference Analysis")

    texts = [
        TextInput(
            source="press_conference", team=home_team, date_hours_ago=6,
            text=f"{home_team} manager: The squad is fully fit, sharp and confident. "
                 "We believe in our quality. Strong session today.",
        ),
        TextInput(
            source="injury_report", team=away_team, date_hours_ago=3,
            text=f"{away_team} midfielder is a serious doubt after a scan. "
                 "Concern over his availability. Team fatigued from travel.",
        ),
    ]

    sentiment_agent   = SentimentAgent(verbose=True)
    sentiment_outputs = sentiment_agent.analyse(texts)

    # ── Step 3: Quantitative Modeling ──────────────────────────────
    print("▶ STEP 3 — Quantitative Modeling (Dixon-Coles)")

    matches = get_sample_matches()
    quant_agent = QuantitativeAgent(verbose=True)
    quant_agent.train(matches)

    # Convert physio output for xG adjustment
    physio_json = json.loads(physio_agent.to_json(physio_outputs))
    injuries = [
        InjuryEvent(
            player_name = "Key Midfielder",
            team        = away_team,
            position    = "MID",
            severity    = "moderate",
            vorp_rating = 0.65,
        )
    ]

    quant_output = quant_agent.analyse(
        home_team        = home_team,
        away_team        = away_team,
        injuries         = injuries,
        physio_penalties = physio_json,
    )

    # Apply sentiment xG multipliers
    if home_team in sentiment_outputs:
        mult = sentiment_outputs[home_team].xg_adjustment_multiplier
        quant_output.params.lambda_home = round(quant_output.params.lambda_home * mult, 4)

    if away_team in sentiment_outputs:
        mult = sentiment_outputs[away_team].xg_adjustment_multiplier
        quant_output.params.mu_away = round(quant_output.params.mu_away * mult, 4)

    # ── Step 4: Monte Carlo Simulation ─────────────────────────────
    print("▶ STEP 4 — Monte Carlo Copula Simulation")

    config = SimulationConfig(n_iterations=100_000, random_seed=99)
    mc_agent = MonteCarloAgent(config=config, verbose=True)

    h_curve = physio_outputs["home"].decay_curve
    a_curve = physio_outputs["away"].decay_curve

    props = [
        PropDefinition(f"{home_team} Win", "match_result", 0,   "win"),
        PropDefinition("Draw",              "match_result", 0,   "draw"),
        PropDefinition(f"{away_team} Win",  "match_result", 0,   "away_win"),
        PropDefinition("Over 2.5 Goals",    "goals",        2.5, "over"),
        PropDefinition("Under 2.5 Goals",   "goals",        2.5, "under"),
        PropDefinition("Over 3.5 Goals",    "goals",        3.5, "over"),
        PropDefinition("Under 4.5 Cards",   "cards",        4.5, "under"),
        PropDefinition("Over 4.5 Cards",    "cards",        4.5, "over"),
    ]

    mc_output = mc_agent.run(
        lambda_home      = quant_output.params.lambda_home,
        mu_away          = quant_output.params.mu_away,
        home_decay_curve = h_curve,
        away_decay_curve = a_curve,
        props            = props,
    )

    # ── Step 5: Devigging ───────────────────────────────────────────
    print("▶ STEP 5 — Market Devigging (Shin's Method)")

    # Illustrative odds — in production these come from live feed
    market_1x2 = OddsPayload(
        market_name  = f"{home_team} vs {away_team} — 1X2",
        outcomes     = [f"{home_team} Win", "Draw", f"{away_team} Win"],
        decimal_odds = [1.80, 3.50, 4.50],
    )
    market_ou = OddsPayload(
        market_name  = "Over/Under 2.5 Goals",
        outcomes     = ["Over 2.5", "Under 2.5"],
        decimal_odds = [1.90, 1.90],
    )

    devig_agent = DevigAgent(verbose=True)
    devig_1x2   = devig_agent.analyse(market_1x2)
    devig_ou    = devig_agent.analyse(market_ou)

    # ── Step 6: Kelly Sizing ────────────────────────────────────────
    print("▶ STEP 6 — Kelly Capital Management")
    print(f"\n{'─'*70}")
    print(f"  Bankroll: ${bankroll:,.2f}")
    print(f"{'─'*70}")

    manager = KellyManager(bankroll=bankroll, ev_threshold=0.05)

    # Build bet proposals comparing Monte Carlo true probs vs devigged odds
    mc_probs = mc_output.marginal_probs

    bet_proposals = [
        BetProposal(
            name             = f"{home_team} Win",
            true_probability = mc_probs.get(f"{home_team} Win", 0.0),
            decimal_odds     = market_1x2.decimal_odds[0],
        ),
        BetProposal(
            name             = "Over 2.5 Goals",
            true_probability = mc_probs.get("Over 2.5 Goals", 0.0),
            decimal_odds     = market_ou.decimal_odds[0],
        ),
        BetProposal(
            name             = "Under 2.5 Goals",
            true_probability = mc_probs.get("Under 2.5 Goals", 0.0),
            decimal_odds     = market_ou.decimal_odds[1],
        ),
    ]

    kelly_results = manager.evaluate_portfolio(bet_proposals)

    # ── Final Summary ───────────────────────────────────────────────
    print(f"\n{DIVIDER}")
    print(f"  PIPELINE COMPLETE — {home_team} vs {away_team}")
    print(f"{DIVIDER}")
    print(f"  λ (home xG) : {quant_output.params.lambda_home:.3f}")
    print(f"  μ (away xG) : {quant_output.params.mu_away:.3f}")
    print(f"  Home Win    : {mc_probs.get(home_team + ' Win', 0)*100:.1f}%")
    print(f"  Draw        : {mc_probs.get('Draw', 0)*100:.1f}%")
    print(f"  Away Win    : {mc_probs.get(away_team + ' Win', 0)*100:.1f}%")
    print(f"  +EV Bets    : {len(kelly_results)}")
    print(f"{DIVIDER}\n")

    return {
        "physio":    physio_outputs,
        "sentiment": sentiment_outputs,
        "quant":     quant_output,
        "mc":        mc_output,
        "devig_1x2": devig_1x2,
        "kelly":     kelly_results,
    }


if __name__ == "__main__":
    run_pipeline(
        home_team  = "Brazil",
        away_team  = "Scotland",
        venue_name = "Hard Rock Stadium, Miami",
        altitude_m = 4.0,
        wbgt       = 31.5,
        home_tz    = 2,
        away_tz    = 5,
        bankroll   = 10_000.0,
    )
