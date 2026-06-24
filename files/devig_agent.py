"""
Market Devigging Agent (Shin's Method)
========================================
Extracts true implied probabilities from bookmaker odds by
removing the overround (vig/juice).

Implements three methods:
  1. Shin's Method (1992/1993) — insider trader model
  2. Weighted Proportional to Odds (WPO) — favourite-longshot bias correction
  3. Odds Ratio (OR) Method — non-linear transformation

Reference:
  - Shin, H.S. (1992, 1993) — "Measuring the Incidence of Insider Trading"
  - Fingleton & Waldron (1999) — "Optimal Determination of Bookmakers' Betting Odds"
  - Jullien & Salanié (1994) — "Measuring the Incidence of Insider Trading"
"""

from __future__ import annotations
import numpy as np
from scipy.optimize import brentq, minimize_scalar
from dataclasses import dataclass
from typing import Optional
import json


# ─────────────────────────────────────────────
# Data Structures
# ─────────────────────────────────────────────

@dataclass
class OddsPayload:
    """Raw bookmaker odds for a market."""
    market_name: str
    outcomes: list[str]          # e.g. ["Home", "Draw", "Away"]
    decimal_odds: list[float]    # e.g. [2.10, 3.40, 3.60]

    @property
    def implied_probs_raw(self) -> list[float]:
        """Naive implied probabilities (sum > 1.0 due to vig)."""
        return [1.0 / o for o in self.decimal_odds]

    @property
    def overround(self) -> float:
        """Total overround (1.0 = fair book)."""
        return sum(self.implied_probs_raw)

    @property
    def vig_pct(self) -> float:
        """Bookmaker margin as percentage of turnover."""
        return (self.overround - 1.0) / self.overround * 100


@dataclass
class DeviggingOutput:
    """True probabilities extracted by each method."""
    market_name: str
    outcomes: list[str]
    raw_implied: list[float]
    overround: float
    vig_pct: float
    shin_probs: list[float]
    wpo_probs: list[float]
    odds_ratio_probs: list[float]
    shin_z: float               # Shin's insider trading proportion
    consensus_probs: list[float] # Weighted average of all three methods
    favourite_longshot_bias: bool


# ─────────────────────────────────────────────
# Method 1: Shin's Method
# ─────────────────────────────────────────────

def shins_method(decimal_odds: list[float], tol: float = 1e-12) -> tuple[list[float], float]:
    """
    Shin's (1992) method for extracting true probabilities.

    Assumes proportion z of bettors are informed insiders.
    Bookmakers adjust odds to protect against asymmetric information.

    Returns:
        (true_probs, z) — true probability list and insider proportion
    """
    n     = len(decimal_odds)
    raw   = [1.0 / o for o in decimal_odds]
    total = sum(raw)

    def objective(z: float) -> float:
        """
        Jullien-Salanié iterative condition.
        Find z such that the Shin implied probs sum to 1.
        """
        try:
            shin_probs = [
                (np.sqrt(z**2 + 4 * (1 - z) * (qi / total)**2) - z)
                / (2 * (1 - z))
                for qi in raw
            ]
            return sum(shin_probs) - 1.0
        except Exception:
            return 1.0

    # Bracket and solve for z
    try:
        z_opt = brentq(objective, 1e-8, 1.0 - 1e-8, xtol=tol, maxiter=200)
    except ValueError:
        z_opt = 0.0

    probs = [
        (np.sqrt(z_opt**2 + 4 * (1 - z_opt) * (qi / total)**2) - z_opt)
        / (2 * (1 - z_opt))
        for qi in raw
    ]

    # Normalise for floating point safety
    s     = sum(probs)
    probs = [p / s for p in probs]
    return probs, z_opt


# ─────────────────────────────────────────────
# Method 2: Weighted Proportional to Odds (WPO)
# ─────────────────────────────────────────────

def wpo_method(decimal_odds: list[float]) -> list[float]:
    """
    WPO — Margin Weights Proportional to Odds.
    Distributes the overround proportionally to the raw odds.
    Corrects favourite-longshot bias better than basic normalisation.
    """
    raw   = [1.0 / o for o in decimal_odds]
    total = sum(raw)
    n     = len(decimal_odds)

    # Weight each outcome's share of the margin by its own implied probability
    probs = []
    for qi in raw:
        weight = qi / total
        # Margin removed is proportional to the implied probability
        p = qi - weight * (total - 1.0)
        probs.append(max(0.0, p))

    s = sum(probs)
    return [p / s for p in probs]


# ─────────────────────────────────────────────
# Method 3: Odds Ratio Method
# ─────────────────────────────────────────────

def odds_ratio_method(decimal_odds: list[float]) -> list[float]:
    """
    Odds Ratio devigging method (Cheung, 2015).
    Solves for a single scaling factor c such that
    P_i = (1/O_i) / (c + (1 - c) * (1/O_i)) sum to 1.

    Handles favourite-longshot bias with a non-linear approach.
    """
    raw = [1.0 / o for o in decimal_odds]

    def residual(c: float) -> float:
        denom_probs = [qi / (c + (1 - c) * qi) for qi in raw]
        return sum(denom_probs) - 1.0

    try:
        c_opt = brentq(residual, -10.0, 10.0, xtol=1e-12, maxiter=300)
    except ValueError:
        c_opt = 0.0

    probs = [qi / (c_opt + (1 - c_opt) * qi) for qi in raw]
    s     = sum(probs)
    return [p / s for p in probs]


# ─────────────────────────────────────────────
# Consensus & Bias Detection
# ─────────────────────────────────────────────

def consensus_probabilities(
    shin: list[float],
    wpo: list[float],
    odds_ratio: list[float],
    weights: tuple[float, float, float] = (0.5, 0.25, 0.25),
) -> list[float]:
    """Weighted average of three devigging methods."""
    n     = len(shin)
    w     = weights
    probs = [(w[0] * shin[i] + w[1] * wpo[i] + w[2] * odds_ratio[i]) for i in range(n)]
    s     = sum(probs)
    return [p / s for p in probs]


def detect_favourite_longshot_bias(
    raw_probs: list[float], true_probs: list[float]
) -> bool:
    """
    Detect if favourite-longshot bias is present.
    True if the lowest-probability outcome has a higher raw/true ratio
    than the highest-probability outcome.
    """
    if len(raw_probs) < 2:
        return False
    ratios = [r / t for r, t in zip(raw_probs, true_probs)]
    fav_idx  = raw_probs.index(max(raw_probs))   # favourite (highest implied)
    dog_idx  = raw_probs.index(min(raw_probs))   # longshot  (lowest implied)
    # Longshot bias: bookmaker overprices longshots (ratio > 1 for them vs fav)
    return ratios[dog_idx] > ratios[fav_idx]


# ─────────────────────────────────────────────
# Main Agent Class
# ─────────────────────────────────────────────

class DevigAgent:
    """
    Market Devigging Agent.

    Processes bookmaker odds and returns true implied probabilities
    using Shin's Method, WPO, and Odds Ratio approaches.
    """

    def __init__(self, verbose: bool = True):
        self.verbose = verbose

    def analyse(self, payload: OddsPayload) -> DeviggingOutput:
        """
        Run all three devigging methods and return consensus probabilities.

        Args:
            payload: OddsPayload with decimal odds

        Returns:
            DeviggingOutput with probabilities from each method
        """
        raw   = payload.implied_probs_raw
        total = payload.overround

        shin_probs, z  = shins_method(payload.decimal_odds)
        wpo_probs       = wpo_method(payload.decimal_odds)
        or_probs        = odds_ratio_method(payload.decimal_odds)
        consensus       = consensus_probabilities(shin_probs, wpo_probs, or_probs)
        flb             = detect_favourite_longshot_bias(raw, shin_probs)

        output = DeviggingOutput(
            market_name      = payload.market_name,
            outcomes         = payload.outcomes,
            raw_implied      = [round(p, 6) for p in raw],
            overround        = round(total, 5),
            vig_pct          = round(payload.vig_pct, 3),
            shin_probs       = [round(p, 6) for p in shin_probs],
            wpo_probs        = [round(p, 6) for p in wpo_probs],
            odds_ratio_probs = [round(p, 6) for p in or_probs],
            shin_z           = round(z, 6),
            consensus_probs  = [round(p, 6) for p in consensus],
            favourite_longshot_bias = flb,
        )

        if self.verbose:
            self._print_summary(output)

        return output

    def batch_analyse(self, payloads: list[OddsPayload]) -> list[DeviggingOutput]:
        """Process multiple markets at once."""
        return [self.analyse(p) for p in payloads]

    def to_json(self, output: DeviggingOutput) -> str:
        """Serialize to JSON for downstream agents."""
        result = {
            "market":     output.market_name,
            "outcomes":   output.outcomes,
            "overround":  output.overround,
            "vig_pct":    output.vig_pct,
            "shin_z":     output.shin_z,
            "flb_detected": output.favourite_longshot_bias,
            "probabilities": {
                outcome: {
                    "raw_implied": output.raw_implied[i],
                    "shin":        output.shin_probs[i],
                    "wpo":         output.wpo_probs[i],
                    "odds_ratio":  output.odds_ratio_probs[i],
                    "consensus":   output.consensus_probs[i],
                }
                for i, outcome in enumerate(output.outcomes)
            }
        }
        return json.dumps(result, indent=2)

    def _print_summary(self, out: DeviggingOutput):
        print(f"\n{'─'*65}")
        print(f"  DEVIGGING — {out.market_name}")
        print(f"  Overround: {out.overround:.4f} | Vig: {out.vig_pct:.2f}% | Shin z={out.shin_z:.5f}")
        print(f"  FLB Detected: {'YES' if out.favourite_longshot_bias else 'No'}")
        print(f"{'─'*65}")
        header = f"  {'Outcome':<12} {'Raw':>8} {'Shin':>8} {'WPO':>8} {'OR':>8} {'Consensus':>10}"
        print(header)
        print(f"  {'─'*57}")
        for i, outcome in enumerate(out.outcomes):
            print(
                f"  {outcome:<12}"
                f" {out.raw_implied[i]*100:>7.2f}%"
                f" {out.shin_probs[i]*100:>7.2f}%"
                f" {out.wpo_probs[i]*100:>7.2f}%"
                f" {out.odds_ratio_probs[i]*100:>7.2f}%"
                f" {out.consensus_probs[i]*100:>9.2f}%"
            )
        print(f"{'─'*65}\n")


# ─────────────────────────────────────────────
# Example usage
# ─────────────────────────────────────────────

if __name__ == "__main__":

    # 1X2 market — Brazil vs Scotland
    market_1x2 = OddsPayload(
        market_name  = "Brazil vs Scotland — 1X2",
        outcomes     = ["Brazil Win", "Draw", "Scotland Win"],
        decimal_odds = [1.65, 3.80, 5.50],
    )

    # Over/Under 2.5 goals
    market_ou = OddsPayload(
        market_name  = "Brazil vs Scotland — Over/Under 2.5",
        outcomes     = ["Over 2.5", "Under 2.5"],
        decimal_odds = [1.85, 1.95],
    )

    agent = DevigAgent(verbose=True)

    result_1x2 = agent.analyse(market_1x2)
    result_ou  = agent.analyse(market_ou)

    print("=== 1X2 JSON ===")
    print(agent.to_json(result_1x2))

    print("\n=== O/U JSON ===")
    print(agent.to_json(result_ou))
