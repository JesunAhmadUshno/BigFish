"""
Monte Carlo Copula Simulation Agent
=====================================
Constructs joint probability distributions for correlated match events.

Key capabilities:
  - Minute-by-minute Poisson process simulation
  - Gaussian and Clayton Copula for dependency modeling
  - Correlation matrix construction across player props & match outcomes
  - Joint probability estimation for multi-leg parlay analysis
  - 100,000 iteration default for stable probability estimates

Mathematical basis:
  - Sklar's Theorem: any joint distribution = Copula(marginals)
  - Gaussian Copula: C(u,v) = Φ_ρ(Φ^-1(u), Φ^-1(v))
  - Clayton Copula: C(u,v) = (u^-θ + v^-θ - 1)^(-1/θ)
"""

from __future__ import annotations
import numpy as np
from scipy.stats import norm, poisson, multivariate_normal
from scipy.special import ndtri
from dataclasses import dataclass, field
from typing import Optional
import json


# ─────────────────────────────────────────────
# Data Structures
# ─────────────────────────────────────────────

@dataclass
class SimulationConfig:
    """Configuration for the Monte Carlo simulation."""
    n_iterations: int   = 100_000
    max_goals:    int   = 10
    random_seed:  int   = 42
    copula_type:  str   = "gaussian"    # "gaussian" | "clayton"
    clayton_theta: float = 2.0          # Clayton copula tail dependence


@dataclass
class PropDefinition:
    """A single market proposition to simulate."""
    name: str               # e.g. "Home Win", "Over 2.5", "Player A 2+ Shots"
    category: str           # "match_result" | "goals" | "cards" | "player_prop"
    threshold: float        # numerical threshold where applicable
    direction: str          # "over" | "under" | "exact" | "win" | "draw"


@dataclass
class SimulationOutput:
    """Results from the Monte Carlo simulation."""
    n_iterations: int
    props: list[str]
    marginal_probs: dict[str, float]
    correlation_matrix: list[list[float]]
    joint_probs: dict[str, float]       # key: "prop_i|prop_j|..."  value: joint prob
    summary_stats: dict


# ─────────────────────────────────────────────
# Copula Implementations
# ─────────────────────────────────────────────

class GaussianCopula:
    """
    Gaussian Copula with given correlation matrix.
    Models linear dependence structure between uniform marginals.
    """
    def __init__(self, rho_matrix: np.ndarray):
        self.rho = rho_matrix
        self.n   = rho_matrix.shape[0]

    def sample(self, n: int, seed: int = 42) -> np.ndarray:
        """
        Draw n samples from the Gaussian copula.
        Returns array of shape (n, self.n) with values in [0,1].
        """
        rng = np.random.default_rng(seed)
        mvn = multivariate_normal(mean=np.zeros(self.n), cov=self.rho, allow_singular=True)
        z   = mvn.rvs(size=n, random_state=rng)
        return norm.cdf(z)


class ClaytonCopula:
    """
    Clayton Copula — captures lower tail dependence.
    Useful for events that tend to co-occur in adverse scenarios.
    """
    def __init__(self, theta: float = 2.0):
        self.theta = max(theta, 0.01)

    def sample(self, n: int, n_dims: int = 2, seed: int = 42) -> np.ndarray:
        """
        Draw n samples using the conditional inversion method.
        Returns array of shape (n, n_dims) with values in [0,1].
        """
        rng = np.random.default_rng(seed)
        u   = np.zeros((n, n_dims))
        u[:, 0] = rng.uniform(size=n)

        for d in range(1, n_dims):
            v = rng.uniform(size=n)
            # Conditional CDF inversion for Clayton
            u[:, d] = (v ** (-self.theta / (1 + d * self.theta)) + u[:, d-1] ** (-self.theta) - 1) ** (-1 / self.theta)
            u[:, d] = np.clip(u[:, d], 1e-8, 1 - 1e-8)

        return u


# ─────────────────────────────────────────────
# Match Simulation Engine
# ─────────────────────────────────────────────

class MatchSimulator:
    """
    Simulates a single football match minute-by-minute.
    Returns a rich event dictionary per simulation.
    """

    def __init__(
        self,
        lambda_home: float,
        mu_away: float,
        home_decay_curve: list[float],
        away_decay_curve: list[float],
        home_card_rate: float = 0.025,
        away_card_rate: float = 0.025,
        home_corner_rate: float = 0.07,
        away_corner_rate: float = 0.07,
    ):
        self.lam_home      = lambda_home
        self.mu_away       = mu_away
        self.home_decay    = home_decay_curve
        self.away_decay    = away_decay_curve
        self.home_card_rate = home_card_rate
        self.away_card_rate = away_card_rate
        self.home_corner_rate = home_corner_rate
        self.away_corner_rate = away_corner_rate

    def simulate_one(self, rng: np.random.Generator) -> dict:
        """Simulate a full 90-minute match. Returns event summary dict."""
        home_goals = away_goals = 0
        home_cards = away_cards = 0
        home_shots_on_target = away_shots_on_target = 0
        home_corners = away_corners = 0
        goal_times: list[int] = []

        # Normalize base rates per minute
        lam_per_min = self.lam_home / 90.0
        mu_per_min  = self.mu_away  / 90.0

        for minute in range(1, 91):
            idx = min(minute, len(self.home_decay) - 1)
            h_efficacy = self.home_decay[idx]
            a_efficacy = self.away_decay[idx]

            # Scoreline momentum: trailing team plays more open
            trailing_bonus_h = 0.15 if away_goals > home_goals else 0.0
            trailing_bonus_a = 0.15 if home_goals > away_goals else 0.0

            h_rate = lam_per_min * h_efficacy * (1 + trailing_bonus_h)
            a_rate = mu_per_min  * a_efficacy * (1 + trailing_bonus_a)

            if rng.random() < h_rate:
                home_goals += 1
                goal_times.append(minute)
            if rng.random() < a_rate:
                away_goals += 1
                goal_times.append(-minute)   # negative = away goal

            # Yellow cards (rate increases with fatigue in last 20 min)
            card_fatigue = 1.0 + (0.5 if minute > 70 else 0.0)
            if rng.random() < self.home_card_rate / 90 * card_fatigue:
                home_cards += 1
            if rng.random() < self.away_card_rate / 90 * card_fatigue:
                away_cards += 1

            # Shots on target (correlated with goal rate)
            if rng.random() < h_rate * 3.5:
                home_shots_on_target += 1
            if rng.random() < a_rate * 3.5:
                away_shots_on_target += 1

            # Corners
            if rng.random() < self.home_corner_rate / 90:
                home_corners += 1
            if rng.random() < self.away_corner_rate / 90:
                away_corners += 1

        return {
            "home_goals":            home_goals,
            "away_goals":            away_goals,
            "total_goals":           home_goals + away_goals,
            "home_cards":            home_cards,
            "away_cards":            away_cards,
            "total_cards":           home_cards + away_cards,
            "home_shots_on_target":  home_shots_on_target,
            "away_shots_on_target":  away_shots_on_target,
            "home_corners":          home_corners,
            "away_corners":          away_corners,
            "home_win":              home_goals > away_goals,
            "draw":                  home_goals == away_goals,
            "away_win":              away_goals > home_goals,
            "goal_times":            goal_times,
        }


# ─────────────────────────────────────────────
# Main Agent Class
# ─────────────────────────────────────────────

class MonteCarloAgent:
    """
    Monte Carlo Copula Simulation Agent.

    Runs N simulated matches, constructs correlation matrices,
    and calculates joint probabilities for prop combinations.
    """

    def __init__(self, config: Optional[SimulationConfig] = None, verbose: bool = True):
        self.config  = config or SimulationConfig()
        self.verbose = verbose
        self._sim_results: list[dict] = []

    def run(
        self,
        lambda_home: float,
        mu_away: float,
        home_decay_curve: Optional[list[float]] = None,
        away_decay_curve: Optional[list[float]] = None,
        props: Optional[list[PropDefinition]] = None,
    ) -> SimulationOutput:
        """
        Run the full Monte Carlo simulation.

        Args:
            lambda_home:      Expected goals — home team
            mu_away:          Expected goals — away team
            home_decay_curve: Physical efficacy curve from PhysiometricAgent
            away_decay_curve: Physical efficacy curve from PhysiometricAgent
            props:            List of market propositions to evaluate

        Returns:
            SimulationOutput with marginals, correlation matrix, joint probs.
        """
        N = self.config.n_iterations
        rng = np.random.default_rng(self.config.random_seed)

        # Flat decay if not provided
        flat = [1.0] * 106
        h_decay = home_decay_curve or flat
        a_decay = away_decay_curve or flat

        simulator = MatchSimulator(
            lambda_home      = lambda_home,
            mu_away          = mu_away,
            home_decay_curve = h_decay,
            away_decay_curve = a_decay,
        )

        if self.verbose:
            print(f"[MonteCarloAgent] Running {N:,} simulations...")

        results = [simulator.simulate_one(rng) for _ in range(N)]
        self._sim_results = results

        # Default props if none specified
        props = props or self._default_props()
        prop_names = [p.name for p in props]

        # Build binary indicator matrix: shape (N, n_props)
        indicator = self._build_indicators(results, props)

        marginals = {
            p.name: float(np.mean(indicator[:, i]))
            for i, p in enumerate(props)
        }

        corr_matrix = np.corrcoef(indicator.T)
        corr_list   = [[round(float(v), 4) for v in row] for row in corr_matrix]

        joint_probs = self._compute_joint_probs(indicator, props)

        summary = {
            "n_simulations": N,
            "avg_home_goals": round(float(np.mean([r["home_goals"] for r in results])), 3),
            "avg_away_goals": round(float(np.mean([r["away_goals"] for r in results])), 3),
            "avg_total_cards": round(float(np.mean([r["total_cards"] for r in results])), 3),
            "avg_total_goals": round(float(np.mean([r["total_goals"] for r in results])), 3),
            "home_win_rate": round(float(np.mean([r["home_win"] for r in results])), 4),
            "draw_rate":     round(float(np.mean([r["draw"]     for r in results])), 4),
            "away_win_rate": round(float(np.mean([r["away_win"] for r in results])), 4),
        }

        if self.verbose:
            self._print_summary(summary, marginals)

        return SimulationOutput(
            n_iterations    = N,
            props           = prop_names,
            marginal_probs  = {k: round(v, 4) for k, v in marginals.items()},
            correlation_matrix = corr_list,
            joint_probs     = {k: round(v, 6) for k, v in joint_probs.items()},
            summary_stats   = summary,
        )

    def _build_indicators(self, results: list[dict], props: list[PropDefinition]) -> np.ndarray:
        """Build binary indicator matrix: 1 if prop resolved True in simulation i."""
        N = len(results)
        P = len(props)
        mat = np.zeros((N, P), dtype=np.float32)

        for j, prop in enumerate(props):
            for i, r in enumerate(results):
                mat[i, j] = float(self._evaluate_prop(r, prop))
        return mat

    def _evaluate_prop(self, result: dict, prop: PropDefinition) -> bool:
        """Evaluate whether a prop resolved True in one simulation."""
        cat = prop.category
        thr = prop.threshold
        dir = prop.direction

        if cat == "match_result":
            return {"win": result["home_win"], "draw": result["draw"], "away_win": result["away_win"]}.get(dir, False)
        elif cat == "goals":
            total = result["total_goals"]
            return (total > thr) if dir == "over" else (total < thr) if dir == "under" else (total == thr)
        elif cat == "cards":
            total = result["total_cards"]
            return (total > thr) if dir == "over" else (total < thr)
        elif cat == "player_prop":
            # Placeholder: shots_on_target as a proxy
            total_sot = result["home_shots_on_target"] + result["away_shots_on_target"]
            return (total_sot > thr) if dir == "over" else (total_sot < thr)
        return False

    def _compute_joint_probs(
        self, indicator: np.ndarray, props: list[PropDefinition]
    ) -> dict[str, float]:
        """Compute pairwise and triple joint probabilities."""
        joint = {}
        P = len(props)
        for i in range(P):
            for j in range(i + 1, P):
                key = f"{props[i].name} & {props[j].name}"
                joint[key] = float(np.mean(indicator[:, i] * indicator[:, j]))
        return joint

    def _default_props(self) -> list[PropDefinition]:
        return [
            PropDefinition("Home Win",       "match_result", 0,   "win"),
            PropDefinition("Draw",           "match_result", 0,   "draw"),
            PropDefinition("Away Win",       "match_result", 0,   "away_win"),
            PropDefinition("Over 2.5 Goals", "goals",        2.5, "over"),
            PropDefinition("Under 2.5 Goals","goals",        2.5, "under"),
            PropDefinition("Over 3.5 Goals", "goals",        3.5, "over"),
            PropDefinition("Under 4.5 Cards","cards",        4.5, "under"),
            PropDefinition("Over 4.5 Cards", "cards",        4.5, "over"),
        ]

    def to_json(self, output: SimulationOutput) -> str:
        return json.dumps({
            "n_iterations":    output.n_iterations,
            "props":           output.props,
            "marginal_probs":  output.marginal_probs,
            "correlation_matrix": output.correlation_matrix,
            "joint_probs":     output.joint_probs,
            "summary":         output.summary_stats,
        }, indent=2)

    def _print_summary(self, summary: dict, marginals: dict):
        print(f"\n{'─'*60}")
        print(f"  MONTE CARLO RESULTS ({summary['n_simulations']:,} iterations)")
        print(f"{'─'*60}")
        print(f"  Avg Home Goals : {summary['avg_home_goals']}")
        print(f"  Avg Away Goals : {summary['avg_away_goals']}")
        print(f"  Home Win Rate  : {summary['home_win_rate']*100:.1f}%")
        print(f"  Draw Rate      : {summary['draw_rate']*100:.1f}%")
        print(f"  Away Win Rate  : {summary['away_win_rate']*100:.1f}%")
        print(f"\n  Marginal Probabilities:")
        for name, prob in marginals.items():
            print(f"    {name:<25}: {prob*100:.2f}%")
        print(f"{'─'*60}\n")


# ─────────────────────────────────────────────
# Example usage
# ─────────────────────────────────────────────

if __name__ == "__main__":
    config = SimulationConfig(n_iterations=50_000, random_seed=7)
    agent  = MonteCarloAgent(config=config, verbose=True)

    props = [
        PropDefinition("Brazil Win",         "match_result", 0,   "win"),
        PropDefinition("Over 2.5 Goals",      "goals",        2.5, "over"),
        PropDefinition("Under 3.5 Cards",     "cards",        3.5, "under"),
        PropDefinition("Over 8 Shots on Tgt", "player_prop",  8.0, "over"),
    ]

    output = agent.run(
        lambda_home      = 1.85,
        mu_away          = 0.95,
        props            = props,
    )

    print("\nJoint Probabilities:")
    for combo, prob in output.joint_probs.items():
        print(f"  {combo}: {prob*100:.3f}%")
