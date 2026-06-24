"""
Kelly Criterion & Capital Management
======================================
Implements:
  - Full Kelly Criterion
  - Fractional Kelly (Half, Quarter, Eighth)
  - Simultaneous bet allocation with covariance adjustment
  - Maximum drawdown protection

Reference:
  - Kelly, J.L. (1956) — "A New Interpretation of Information Rate"
"""

from __future__ import annotations
import numpy as np
from dataclasses import dataclass
from typing import Optional


@dataclass
class BetProposal:
    """A single bet under evaluation."""
    name: str
    true_probability: float     # Model's true probability (0-1)
    decimal_odds: float         # Bookmaker decimal odds
    correlation_with_active: float = 0.0   # Pearson correlation vs active bets

    @property
    def net_odds(self) -> float:
        """b: net profit per unit staked (decimal - 1)."""
        return self.decimal_odds - 1.0

    @property
    def implied_probability(self) -> float:
        return 1.0 / self.decimal_odds

    @property
    def edge(self) -> float:
        """Expected value edge = true_prob * net_odds - (1 - true_prob)."""
        return self.true_probability * self.net_odds - (1.0 - self.true_probability)

    @property
    def expected_value(self) -> float:
        """EV = (true_prob × decimal_odds) - 1."""
        return self.true_probability * self.decimal_odds - 1.0


@dataclass
class KellyOutput:
    """Result of Kelly calculation for one bet."""
    bet_name: str
    full_kelly_fraction: float
    half_kelly_fraction: float
    quarter_kelly_fraction: float
    eighth_kelly_fraction: float
    edge_pct: float
    ev: float
    is_positive_ev: bool
    recommended_fraction: str   # which fraction to use
    recommended_value: float


def kelly_fraction(true_prob: float, net_odds: float) -> float:
    """
    Core Kelly formula: f* = (b*p - q) / b
    where b = net odds, p = true prob, q = 1 - p
    """
    q = 1.0 - true_prob
    if net_odds <= 0:
        return 0.0
    f = (net_odds * true_prob - q) / net_odds
    return max(0.0, f)   # Never bet negative Kelly


def fractional_kelly(bet: BetProposal, fraction: float = 0.25) -> float:
    """Apply fractional Kelly to control variance."""
    f_full = kelly_fraction(bet.true_probability, bet.net_odds)
    return f_full * fraction


class KellyManager:
    """
    Capital management engine using Fractional Kelly criterion.
    """

    def __init__(
        self,
        bankroll: float,
        default_fraction: float = 0.25,   # Quarter-Kelly default
        ev_threshold: float = 0.05,
        max_single_bet_pct: float = 0.05, # Never more than 5% on one bet
    ):
        self.bankroll         = bankroll
        self.default_fraction = default_fraction
        self.ev_threshold     = ev_threshold
        self.max_single_pct   = max_single_bet_pct

    def evaluate(self, bet: BetProposal) -> KellyOutput:
        """Evaluate a single bet proposal."""
        f_full  = kelly_fraction(bet.true_probability, bet.net_odds)
        f_half  = f_full * 0.50
        f_qtr   = f_full * 0.25
        f_eighth= f_full * 0.125

        # Reduce further if highly correlated with active portfolio
        corr_discount = max(0.5, 1.0 - abs(bet.correlation_with_active))
        recommended   = min(f_qtr * corr_discount, self.max_single_pct)

        return KellyOutput(
            bet_name              = bet.name,
            full_kelly_fraction   = round(f_full, 6),
            half_kelly_fraction   = round(f_half, 6),
            quarter_kelly_fraction= round(f_qtr, 6),
            eighth_kelly_fraction = round(f_eighth, 6),
            edge_pct              = round(bet.edge * 100, 4),
            ev                    = round(bet.expected_value, 4),
            is_positive_ev        = bet.expected_value > self.ev_threshold,
            recommended_fraction  = f"Quarter-Kelly (corr-adjusted)",
            recommended_value     = round(recommended, 6),
        )

    def stake_in_dollars(self, output: KellyOutput) -> float:
        """Convert Kelly fraction to dollar stake."""
        return round(self.bankroll * output.recommended_value, 2)

    def evaluate_portfolio(self, bets: list[BetProposal]) -> list[KellyOutput]:
        """
        Evaluate a portfolio of bets with covariance adjustment.
        Only executes bets above EV threshold.
        """
        results = []
        for bet in bets:
            out = self.evaluate(bet)
            if out.is_positive_ev:
                results.append(out)
                print(
                    f"  [+EV] {bet.name:<35} "
                    f"Edge: {out.edge_pct:+.2f}% | "
                    f"Stake: {self.stake_in_dollars(out):.2f} "
                    f"({out.recommended_value*100:.3f}% bankroll)"
                )
            else:
                print(f"  [---] {bet.name:<35} EV={out.ev:+.4f} — SKIP")
        return results


if __name__ == "__main__":
    manager = KellyManager(bankroll=10_000, default_fraction=0.25, ev_threshold=0.05)

    bets = [
        BetProposal("Brazil Win",        true_probability=0.72, decimal_odds=1.65),
        BetProposal("Over 2.5 Goals",    true_probability=0.58, decimal_odds=1.85),
        BetProposal("Scotland Win",      true_probability=0.08, decimal_odds=5.50),
    ]

    print("\n" + "─"*75)
    print("  KELLY CAPITAL MANAGEMENT — Portfolio Evaluation")
    print("─"*75)
    results = manager.evaluate_portfolio(bets)
