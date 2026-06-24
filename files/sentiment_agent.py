"""
Sentiment & Press Conference Analyzer Agent
============================================
Performs NLP analysis on:
  - Press conference transcripts
  - Injury news articles
  - Lineup announcements
  - Social media sentiment (structured input)

Outputs a structured sentiment vector affecting:
  - Team momentum score
  - Psychological confidence index
  - Injury concern weighting
  - Tactical formation hints

Uses rule-based + transformer-based scoring.
Install: pip install transformers torch
"""

from __future__ import annotations
import re
import json
from dataclasses import dataclass, field
from typing import Optional

# Graceful fallback if transformers not installed
try:
    from transformers import pipeline as hf_pipeline
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False


# ─────────────────────────────────────────────
# Data Structures
# ─────────────────────────────────────────────

@dataclass
class TextInput:
    """A piece of text to be analyzed."""
    source: str         # "press_conference" | "injury_report" | "lineup_news" | "social"
    team: str
    text: str
    date_hours_ago: int = 0


@dataclass
class SentimentOutput:
    """Full sentiment analysis output for a team."""
    team: str
    overall_sentiment_score: float      # -1.0 (very negative) to +1.0 (very positive)
    confidence_index: float             # 0.0 – 1.0
    momentum_score: float               # -1.0 to +1.0
    injury_concern_level: float         # 0.0 (none) – 1.0 (critical)
    formation_hint: Optional[str]       # e.g. "4-3-3" | "5-4-1" | None
    key_signals: list[dict]             # list of detected signals
    raw_scores: dict
    xg_adjustment_multiplier: float     # how much to adjust xG based on sentiment


# ─────────────────────────────────────────────
# Keyword Lexicons
# ─────────────────────────────────────────────

POSITIVE_SIGNALS = {
    # Confidence / momentum
    "confident":         0.20,
    "ready":             0.15,
    "sharp":             0.15,
    "motivated":         0.18,
    "focused":           0.12,
    "hungry":            0.15,
    "believe":           0.12,
    "strong":            0.10,
    "excellent session": 0.20,
    "fully fit":         0.25,
    "100%":              0.20,
    "best form":         0.22,
    "clicking":          0.18,
    "chemistry":         0.10,
    "goal threat":       0.15,
    "winning mentality": 0.20,
}

NEGATIVE_SIGNALS = {
    # Injury / doubt
    "doubt":             -0.20,
    "concern":           -0.15,
    "injury":            -0.18,
    "ruled out":         -0.35,
    "training setback":  -0.25,
    "not fit":           -0.30,
    "scan":              -0.15,
    "precaution":        -0.12,
    "absence":           -0.20,
    "unavailable":       -0.28,
    # Psychological
    "pressure":          -0.10,
    "criticism":         -0.08,
    "disappointed":      -0.15,
    "worried":           -0.12,
    "divided":           -0.10,
    "must win":          -0.08,
    "eliminate":         -0.05,
    "frustrated":        -0.12,
    "difficult":         -0.06,
    "tired":             -0.15,
    "fatigued":          -0.18,
    "heavy legs":        -0.20,
    "travel":            -0.08,
}

INJURY_CRITICAL_TERMS = {
    "fracture", "surgery", "torn", "cruciate", "ligament",
    "ruled out", "season over", "green whistle", "methoxyflurane",
    "stretcher", "hospital", "scan", "mri",
}

FORMATION_PATTERNS = {
    r"4[-\s]?4[-\s]?2":  "4-4-2",
    r"4[-\s]?3[-\s]?3":  "4-3-3",
    r"4[-\s]?2[-\s]?3[-\s]?1": "4-2-3-1",
    r"3[-\s]?5[-\s]?2":  "3-5-2",
    r"5[-\s]?3[-\s]?2":  "5-3-2",
    r"5[-\s]?4[-\s]?1":  "5-4-1",
    r"3[-\s]?4[-\s]?3":  "3-4-3",
    r"4[-\s]?1[-\s]?4[-\s]?1": "4-1-4-1",
}


# ─────────────────────────────────────────────
# Rule-Based Scorer
# ─────────────────────────────────────────────

class RuleBasedScorer:
    """Fast, deterministic lexicon-based sentiment scorer."""

    def score(self, text: str) -> dict:
        text_lower = text.lower()
        pos_score  = 0.0
        neg_score  = 0.0
        signals    = []

        for term, weight in POSITIVE_SIGNALS.items():
            if term in text_lower:
                pos_score += weight
                signals.append({"signal": term, "polarity": "positive", "weight": weight})

        for term, weight in NEGATIVE_SIGNALS.items():
            if term in text_lower:
                neg_score += abs(weight)
                signals.append({"signal": term, "polarity": "negative", "weight": weight})

        injury_count = sum(1 for t in INJURY_CRITICAL_TERMS if t in text_lower)
        injury_level = min(1.0, injury_count * 0.25)

        # Formation detection
        formation = None
        for pattern, fmt in FORMATION_PATTERNS.items():
            if re.search(pattern, text_lower):
                formation = fmt
                break

        raw_sentiment = (pos_score - neg_score) / max(1.0, pos_score + neg_score)
        raw_sentiment = max(-1.0, min(1.0, raw_sentiment))

        return {
            "sentiment":     raw_sentiment,
            "pos_score":     pos_score,
            "neg_score":     neg_score,
            "injury_level":  injury_level,
            "formation":     formation,
            "signals":       signals,
        }


# ─────────────────────────────────────────────
# Transformer Scorer (optional)
# ─────────────────────────────────────────────

class TransformerScorer:
    """
    Uses a pre-trained HuggingFace sentiment model.
    Falls back gracefully if transformers not installed.
    """

    def __init__(self, model_name: str = "distilbert-base-uncased-finetuned-sst-2-english"):
        self._pipe = None
        if TRANSFORMERS_AVAILABLE:
            try:
                self._pipe = hf_pipeline("sentiment-analysis", model=model_name, truncation=True)
            except Exception:
                pass

    def score(self, text: str) -> Optional[float]:
        """Returns sentiment in [-1.0, +1.0] or None if unavailable."""
        if self._pipe is None:
            return None
        # Truncate to 512 tokens
        short = text[:1000]
        result = self._pipe(short)[0]
        label  = result["label"].upper()
        conf   = result["score"]
        return conf if label == "POSITIVE" else -conf


# ─────────────────────────────────────────────
# Main Agent Class
# ─────────────────────────────────────────────

class SentimentAgent:
    """
    Sentiment & Press Conference Analyzer Agent.

    Ingests text from multiple sources and constructs a
    structured sentiment vector for each team.
    """

    def __init__(self, use_transformer: bool = False, verbose: bool = True):
        self.rule_scorer        = RuleBasedScorer()
        self.transformer_scorer = TransformerScorer() if use_transformer else None
        self.verbose            = verbose

    def analyse(self, inputs: list[TextInput]) -> dict[str, SentimentOutput]:
        """
        Analyse all text inputs and return per-team sentiment outputs.

        Args:
            inputs: List of TextInput objects from various sources

        Returns:
            Dict mapping team name -> SentimentOutput
        """
        team_data: dict[str, list[dict]] = {}

        for text_input in inputs:
            rule_result = self.rule_scorer.score(text_input.text)

            # Transformer score (blended in if available)
            tf_score = None
            if self.transformer_scorer:
                tf_score = self.transformer_scorer.score(text_input.text)

            final_sentiment = rule_result["sentiment"]
            if tf_score is not None:
                final_sentiment = 0.6 * final_sentiment + 0.4 * tf_score

            # Recency weighting: older news has less impact
            recency = max(0.2, 1.0 - text_input.date_hours_ago / 168.0)   # decay over 7 days

            entry = {
                "source":       text_input.source,
                "sentiment":    final_sentiment * recency,
                "injury_level": rule_result["injury_level"],
                "formation":    rule_result["formation"],
                "signals":      rule_result["signals"],
                "raw_rule":     rule_result["sentiment"],
                "tf_score":     tf_score,
                "recency":      recency,
            }

            if text_input.team not in team_data:
                team_data[text_input.team] = []
            team_data[text_input.team].append(entry)

        # Aggregate per team
        outputs = {}
        for team, entries in team_data.items():
            output = self._aggregate(team, entries)
            outputs[team] = output

        if self.verbose:
            for team, output in outputs.items():
                self._print_summary(output)

        return outputs

    def _aggregate(self, team: str, entries: list[dict]) -> SentimentOutput:
        """Aggregate multiple text entries into a single team output."""
        sentiments   = [e["sentiment"] for e in entries]
        injury_levels = [e["injury_level"] for e in entries]
        formations   = [e["formation"] for e in entries if e["formation"]]
        all_signals  = []
        for e in entries:
            all_signals.extend(e["signals"])

        avg_sentiment  = float(sum(sentiments) / max(1, len(sentiments)))
        max_injury     = max(injury_levels) if injury_levels else 0.0
        top_formation  = formations[0] if formations else None

        # Confidence index: how consistently positive or negative
        variance       = float(sum((s - avg_sentiment)**2 for s in sentiments) / max(1, len(sentiments)))
        confidence     = max(0.0, 1.0 - variance)

        # Momentum: recent-weighted trend
        if len(sentiments) > 1:
            recent = sum(sentiments[-3:]) / min(3, len(sentiments))
            older  = sum(sentiments[:-3]) / max(1, len(sentiments) - 3)
            momentum = recent - older
        else:
            momentum = avg_sentiment

        momentum = max(-1.0, min(1.0, momentum))

        # xG adjustment: sentiment affects team performance by up to ±8%
        xg_mult = 1.0 + (avg_sentiment * 0.08) - (max_injury * 0.05)
        xg_mult = max(0.85, min(1.15, xg_mult))

        return SentimentOutput(
            team                     = team,
            overall_sentiment_score  = round(avg_sentiment, 4),
            confidence_index         = round(confidence, 4),
            momentum_score           = round(momentum, 4),
            injury_concern_level     = round(max_injury, 4),
            formation_hint           = top_formation,
            key_signals              = all_signals[:10],   # top 10 signals
            raw_scores               = {"n_inputs": len(entries), "sentiments": sentiments},
            xg_adjustment_multiplier = round(xg_mult, 4),
        )

    def to_json(self, outputs: dict[str, SentimentOutput]) -> str:
        result = {}
        for team, out in outputs.items():
            result[team] = {
                "overall_sentiment":     out.overall_sentiment_score,
                "confidence_index":      out.confidence_index,
                "momentum_score":        out.momentum_score,
                "injury_concern_level":  out.injury_concern_level,
                "formation_hint":        out.formation_hint,
                "xg_adjustment_mult":    out.xg_adjustment_multiplier,
                "key_signals":           out.key_signals[:5],
            }
        return json.dumps(result, indent=2)

    def _print_summary(self, out: SentimentOutput):
        sentiment_label = "POSITIVE" if out.overall_sentiment_score > 0.1 else \
                          "NEGATIVE" if out.overall_sentiment_score < -0.1 else "NEUTRAL"
        print(f"\n{'─'*60}")
        print(f"  SENTIMENT — {out.team}  [{sentiment_label}]")
        print(f"{'─'*60}")
        print(f"  Overall Sentiment   : {out.overall_sentiment_score:+.3f}")
        print(f"  Confidence Index    : {out.confidence_index:.3f}")
        print(f"  Momentum Score      : {out.momentum_score:+.3f}")
        print(f"  Injury Concern      : {out.injury_concern_level:.3f}")
        print(f"  Formation Hint      : {out.formation_hint or 'Unknown'}")
        print(f"  xG Adjustment Mult  : {out.xg_adjustment_multiplier:.4f}")
        if out.key_signals:
            print(f"  Top Signals:")
            for sig in out.key_signals[:4]:
                print(f"    [{sig['polarity'].upper():8s}] '{sig['signal']}' ({sig['weight']:+.2f})")
        print(f"{'─'*60}\n")


# ─────────────────────────────────────────────
# Example usage
# ─────────────────────────────────────────────

if __name__ == "__main__":
    inputs = [
        TextInput(
            source         = "press_conference",
            team           = "Brazil",
            date_hours_ago = 4,
            text           = """
                The manager was confident and motivated ahead of the match.
                The squad is fully fit, with all players sharp and ready.
                We believe in our quality and our winning mentality.
                Vinicius is in excellent form and is a clear goal threat.
            """,
        ),
        TextInput(
            source         = "injury_report",
            team           = "Scotland",
            date_hours_ago = 2,
            text           = """
                Key midfielder is a serious doubt after a training setback yesterday.
                The medical team ran a scan and there is significant concern.
                His absence will be a major blow. The team is tired after heavy travel.
                Some players reported heavy legs ahead of the Miami fixture.
                The squad looks fatigued and the manager seems worried.
            """,
        ),
        TextInput(
            source         = "lineup_news",
            team           = "Scotland",
            date_hours_ago = 1,
            text           = """
                Expected formation 5-4-1, parking the bus against Brazil.
                Defensive shape is the priority. Robertson unavailable.
            """,
        ),
    ]

    agent   = SentimentAgent(use_transformer=False, verbose=True)
    outputs = agent.analyse(inputs)
    print(agent.to_json(outputs))
