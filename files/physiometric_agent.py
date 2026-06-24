"""
Physiometric & Environmental Agent
===================================
Models the physical degradation of players due to:
  - Altitude hypoxia (VO2max decay)
  - Thermal stress (WBGT / UTCI)
  - Circadian misalignment (jet lag)
  - Travel fatigue
  - Soft-tissue injury probability

Research basis:
  - VO2max decreases 7-8% per 1000m above 1500m altitude
  - High altitude causes ~21% drop in high-velocity running
  - WBGT > 32°C triggers mandatory FIFA cooling breaks
"""

from __future__ import annotations
import numpy as np
from dataclasses import dataclass, field
from typing import Optional
import json


# ─────────────────────────────────────────────
# Data Structures
# ─────────────────────────────────────────────

@dataclass
class EnvironmentalPayload:
    """Raw environmental inputs for a match venue."""
    venue_name: str
    altitude_m: float                   # metres above sea level
    wbgt_celsius: float                 # Wet-Bulb Globe Temperature
    humidity_pct: float                 # 0–100
    wind_kph: float                     # kilometres per hour
    utci_celsius: float                 # Universal Thermal Climate Index


@dataclass
class BiologicalPayload:
    """Team-level biological and travel inputs."""
    team_name: str
    time_zones_crossed: int             # absolute timezone delta from home base
    hours_since_last_match: float
    baseline_vo2max: float              # ml/kg/min — elite avg ~60
    altitude_acclimatised: bool         # True if team trains at high altitude
    injury_risk_index: float            # 0.0 – 1.0 from ML injury model
    is_away_team: bool


@dataclass
class PhysiometricOutput:
    """Output decay curve + summary metrics for one team."""
    team_name: str
    vo2max_adjusted: float
    circadian_penalty_pct: float
    thermal_penalty_pct: float
    altitude_penalty_pct: float
    substitution_probability_boost: float
    cooling_break_triggered: bool
    decay_curve: list[float]            # physical efficacy 0→100+ min, 0.0–1.0
    late_error_variance_boost: float    # extra defensive error variance %
    summary: dict


# ─────────────────────────────────────────────
# Constants (from peer-reviewed sports science)
# ─────────────────────────────────────────────

VO2MAX_DECAY_PER_1000M       = 0.075   # 7.5% per 1000m above 1500m
ALTITUDE_THRESHOLD_M         = 1500.0
HIGH_VEL_RUN_DECAY           = 0.21    # 21% drop in high-velocity running at altitude
WBGT_COOLING_BREAK_THRESHOLD = 32.0    # °C — FIFA mandatory cooling break
CIRCADIAN_PENALTY_PER_TZ     = 0.025   # 2.5% reaction time penalty per timezone
CIRCADIAN_WINDOW_HOURS       = 72.0    # penalty applies for first 72h post-flight
THERMAL_DEF_ERROR_BOOST      = 0.12    # 12% increase in defensive variance above WBGT threshold
INJURY_SUBSTITUTION_BOOST    = 0.15    # +15% substitution probability on high injury risk
MATCH_DURATION_MINS          = 105     # 90 + 15 min extra-time buffer


# ─────────────────────────────────────────────
# Core Agent Class
# ─────────────────────────────────────────────

class PhysiometricAgent:
    """
    Lead Environmental Physiologist Agent.

    Processes meteorological + biological payloads and outputs
    time-series physical efficacy decay curves for both teams.
    """

    def __init__(self, verbose: bool = True):
        self.verbose = verbose

    # ── Public API ──────────────────────────────

    def analyse(
        self,
        env: EnvironmentalPayload,
        home: BiologicalPayload,
        away: BiologicalPayload,
    ) -> dict[str, PhysiometricOutput]:
        """
        Main entry point. Analyses both teams against the environment.

        Returns:
            dict with keys 'home' and 'away', each a PhysiometricOutput.
        """
        home_output = self._process_team(env, home)
        away_output = self._process_team(env, away)

        if self.verbose:
            self._print_summary(env, home_output, away_output)

        return {"home": home_output, "away": away_output}

    def to_json(self, outputs: dict[str, PhysiometricOutput]) -> str:
        """Serialize outputs to JSON for downstream agents."""
        result = {}
        for side, out in outputs.items():
            result[side] = {
                "team": out.team_name,
                "vo2max_adjusted": round(out.vo2max_adjusted, 3),
                "circadian_penalty_pct": round(out.circadian_penalty_pct * 100, 2),
                "thermal_penalty_pct": round(out.thermal_penalty_pct * 100, 2),
                "altitude_penalty_pct": round(out.altitude_penalty_pct * 100, 2),
                "substitution_probability_boost": round(out.substitution_probability_boost, 4),
                "cooling_break_triggered": out.cooling_break_triggered,
                "late_error_variance_boost": round(out.late_error_variance_boost * 100, 2),
                "decay_curve": [round(v, 4) for v in out.decay_curve],
                "summary": out.summary,
            }
        return json.dumps(result, indent=2)

    # ── Internal Calculations ────────────────────

    def _process_team(
        self, env: EnvironmentalPayload, bio: BiologicalPayload
    ) -> PhysiometricOutput:

        altitude_penalty  = self._calc_altitude_penalty(env.altitude_m, bio.altitude_acclimatised)
        circadian_penalty = self._calc_circadian_penalty(bio.time_zones_crossed, bio.hours_since_last_match)
        thermal_penalty   = self._calc_thermal_penalty(env.wbgt_celsius)
        cooling_triggered = env.wbgt_celsius > WBGT_COOLING_BREAK_THRESHOLD

        # Adjusted VO2max after environmental stressors
        total_penalty     = altitude_penalty + circadian_penalty + thermal_penalty
        vo2max_adj        = bio.baseline_vo2max * (1.0 - total_penalty)

        # Defensive error variance amplification (heat + late game)
        late_error_var    = THERMAL_DEF_ERROR_BOOST if cooling_triggered else 0.0

        # Substitution probability boost (injury risk)
        sub_boost         = INJURY_SUBSTITUTION_BOOST if bio.injury_risk_index > 0.60 else 0.0

        decay_curve = self._build_decay_curve(
            altitude_penalty  = altitude_penalty,
            thermal_penalty   = thermal_penalty,
            circadian_penalty = circadian_penalty,
            acclimatised      = bio.altitude_acclimatised,
        )

        summary = {
            "total_performance_penalty_pct": round(total_penalty * 100, 2),
            "high_velocity_running_drop_pct": round(altitude_penalty * HIGH_VEL_RUN_DECAY / VO2MAX_DECAY_PER_1000M, 2) if altitude_penalty > 0 else 0.0,
            "altitude_goal_advantage_per_1000m": 0.5 if bio.altitude_acclimatised else -0.5,
            "cooling_breaks_expected": 1 if cooling_triggered else 0,
            "injury_risk_index": bio.injury_risk_index,
        }

        return PhysiometricOutput(
            team_name                  = bio.team_name,
            vo2max_adjusted            = vo2max_adj,
            circadian_penalty_pct      = circadian_penalty,
            thermal_penalty_pct        = thermal_penalty,
            altitude_penalty_pct       = altitude_penalty,
            substitution_probability_boost = sub_boost,
            cooling_break_triggered    = cooling_triggered,
            decay_curve                = decay_curve,
            late_error_variance_boost  = late_error_var,
            summary                    = summary,
        )

    def _calc_altitude_penalty(self, altitude_m: float, acclimatised: bool) -> float:
        """
        VO2max penalty for altitude above 1500m.
        Acclimatised teams receive a 60% reduction in penalty.
        """
        if altitude_m <= ALTITUDE_THRESHOLD_M:
            return 0.0
        thousands_above = (altitude_m - ALTITUDE_THRESHOLD_M) / 1000.0
        raw_penalty = VO2MAX_DECAY_PER_1000M * thousands_above
        return raw_penalty * (0.40 if acclimatised else 1.0)

    def _calc_circadian_penalty(self, tz_crossed: int, hours_since_flight: float) -> float:
        """
        Reaction time and cognitive performance penalty from jet lag.
        Fully decays after 72 hours.
        """
        if tz_crossed == 0 or hours_since_flight >= CIRCADIAN_WINDOW_HOURS:
            return 0.0
        decay_factor  = 1.0 - (hours_since_flight / CIRCADIAN_WINDOW_HOURS)
        raw_penalty   = CIRCADIAN_PENALTY_PER_TZ * abs(tz_crossed)
        return raw_penalty * decay_factor

    def _calc_thermal_penalty(self, wbgt: float) -> float:
        """
        Thermal stress penalty. Non-linear above 28°C.
        Above 32°C (WBGT) mandatory cooling breaks required.
        """
        if wbgt < 28.0:
            return 0.0
        elif wbgt < WBGT_COOLING_BREAK_THRESHOLD:
            return 0.03 + (wbgt - 28.0) * 0.005
        else:
            return 0.05 + (wbgt - WBGT_COOLING_BREAK_THRESHOLD) * 0.01

    def _build_decay_curve(
        self,
        altitude_penalty: float,
        thermal_penalty: float,
        circadian_penalty: float,
        acclimatised: bool,
    ) -> list[float]:
        """
        Builds a time-series (0–105 min) physical efficacy curve.
        Starts near 1.0 and decays based on stressors.
        Altitude non-acclimatised teams show sharp decay after 60 min.
        """
        curve = []
        base_decay_rate = 0.0015   # natural fatigue per minute

        for minute in range(MATCH_DURATION_MINS + 1):
            # Natural fatigue
            natural_fatigue = base_decay_rate * minute

            # Altitude effect accelerates sharply after 60 min
            alt_effect = 0.0
            if altitude_penalty > 0 and not acclimatised and minute > 60:
                alt_effect = altitude_penalty * ((minute - 60) / 45.0) * 0.5

            # Thermal effect ramps through second half
            heat_effect = thermal_penalty * (minute / MATCH_DURATION_MINS) * 0.8

            # Circadian effect is constant early, fades after 45 min
            circ_effect = circadian_penalty * max(0.0, 1.0 - minute / 90.0)

            total_decay = natural_fatigue + alt_effect + heat_effect + circ_effect
            efficacy = max(0.0, 1.0 - total_decay)
            curve.append(round(efficacy, 4))

        return curve

    # ── Pretty Print ────────────────────────────

    def _print_summary(
        self,
        env: EnvironmentalPayload,
        home: PhysiometricOutput,
        away: PhysiometricOutput,
    ):
        separator = "─" * 60
        print(f"\n{separator}")
        print(f"  PHYSIOMETRIC ANALYSIS — {env.venue_name}")
        print(f"  Altitude: {env.altitude_m}m | WBGT: {env.wbgt_celsius}°C | UTCI: {env.utci_celsius}°C")
        print(separator)
        for team_out in [home, away]:
            print(f"\n  [{team_out.team_name}]")
            print(f"    VO2max adjusted    : {team_out.vo2max_adjusted:.1f} ml/kg/min")
            print(f"    Altitude penalty   : {team_out.altitude_penalty_pct*100:.1f}%")
            print(f"    Thermal penalty    : {team_out.thermal_penalty_pct*100:.1f}%")
            print(f"    Circadian penalty  : {team_out.circadian_penalty_pct*100:.1f}%")
            print(f"    Total penalty      : {team_out.summary['total_performance_penalty_pct']:.1f}%")
            print(f"    Cooling break      : {'YES' if team_out.cooling_break_triggered else 'No'}")
            print(f"    Efficacy @ 90 min  : {team_out.decay_curve[90]:.3f}")
        print(f"\n{separator}\n")


# ─────────────────────────────────────────────
# Example usage
# ─────────────────────────────────────────────

if __name__ == "__main__":

    env = EnvironmentalPayload(
        venue_name     = "Estadio Azteca, Mexico City",
        altitude_m     = 2240,
        wbgt_celsius   = 24.0,
        humidity_pct   = 45.0,
        wind_kph       = 12.0,
        utci_celsius   = 28.0,
    )

    home_bio = BiologicalPayload(
        team_name             = "Mexico",
        time_zones_crossed    = 0,
        hours_since_last_match= 168,
        baseline_vo2max       = 62.0,
        altitude_acclimatised = True,
        injury_risk_index     = 0.30,
        is_away_team          = False,
    )

    away_bio = BiologicalPayload(
        team_name             = "Germany",
        time_zones_crossed    = 7,
        hours_since_last_match= 48,
        baseline_vo2max       = 63.0,
        altitude_acclimatised = False,
        injury_risk_index     = 0.45,
        is_away_team          = True,
    )

    agent   = PhysiometricAgent(verbose=True)
    outputs = agent.analyse(env, home_bio, away_bio)
    print(agent.to_json(outputs))
