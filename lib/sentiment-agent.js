/**
 * Sentiment & Injury Analyzer Agent
 * Ports the NLP lexicon scoring logic to JavaScript.
 * Adjusts Expected Goals (xG) based on injury news and confidence/momentum.
 */

const POSITIVE_SIGNALS = {
  "confident": 0.20,
  "ready": 0.15,
  "sharp": 0.15,
  "motivated": 0.18,
  "focused": 0.12,
  "hungry": 0.15,
  "believe": 0.12,
  "strong": 0.10,
  "excellent session": 0.20,
  "fully fit": 0.25,
  "100%": 0.20,
  "best form": 0.22,
  "clicking": 0.18,
  "chemistry": 0.10,
  "goal threat": 0.15,
  "winning mentality": 0.20,
};

const NEGATIVE_SIGNALS = {
  "doubt": -0.20,
  "concern": -0.15,
  "injury": -0.18,
  "ruled out": -0.35,
  "training setback": -0.25,
  "not fit": -0.30,
  "scan": -0.15,
  "precaution": -0.12,
  "absence": -0.20,
  "unavailable": -0.28,
  "pressure": -0.10,
  "criticism": -0.08,
  "disappointed": -0.15,
  "worried": -0.12,
  "divided": -0.10,
  "must win": -0.08,
  "frustrated": -0.12,
  "difficult": -0.06,
  "tired": -0.15,
  "fatigued": -0.18,
  "heavy legs": -0.20,
  "travel": -0.08,
};

const INJURY_CRITICAL_TERMS = [
  "fracture", "surgery", "torn", "cruciate", "ligament",
  "ruled out", "season over", "stretcher", "hospital", "scan", "mri"
];

// Simulated news feed for demonstration
const MOCK_NEWS_FEED = {
  'Switzerland': "The squad is fully fit, with all players sharp and ready. Highly confident.",
  'Canada': "A key defender is a doubt. The team looks tired after heavy travel.",
  'Bosnia': "Manager is under pressure. Midfielder ruled out after a training setback.",
  'Qatar': "Team is in their best form. Motivated and ready to deliver.",
  'Scotland': "Major absence in defense. Worried about the difficult opposition.",
  'Brazil': "100% focused. Winning mentality. Fully fit.",
  'Morocco': "Chemistry is clicking. We are a huge goal threat.",
  'Haiti': "Several injuries. Concern over fatigued players.",
  'Czechia': "Strong preparation, but some tired legs.",
  'Mexico': "Confident and ready. No injury concerns.",
  'South Africa': "Some doubt over the starting striker. He is not fit.",
  'South Korea': "Sharp and highly motivated. Focused on the win."
};

/**
 * Calculate sentiment score for a given text
 */
export function analyzeSentiment(text) {
  if (!text) return { multiplier: 1.0, signals: [], injuryLevel: 0 };
  
  const textLower = text.toLowerCase();
  let posScore = 0.0;
  let negScore = 0.0;
  const signals = [];

  for (const [term, weight] of Object.entries(POSITIVE_SIGNALS)) {
    if (textLower.includes(term)) {
      posScore += weight;
      signals.push({ signal: term, polarity: 'positive', weight });
    }
  }

  for (const [term, weight] of Object.entries(NEGATIVE_SIGNALS)) {
    if (textLower.includes(term)) {
      negScore += Math.abs(weight);
      signals.push({ signal: term, polarity: 'negative', weight });
    }
  }

  let injuryCount = 0;
  for (const term of INJURY_CRITICAL_TERMS) {
    if (textLower.includes(term)) injuryCount++;
  }
  const injuryLevel = Math.min(1.0, injuryCount * 0.25);

  let rawSentiment = (posScore - negScore) / Math.max(1.0, posScore + negScore);
  rawSentiment = Math.max(-1.0, Math.min(1.0, rawSentiment));

  // xG adjustment: sentiment affects team performance by up to ±8%
  let xgMult = 1.0 + (rawSentiment * 0.08) - (injuryLevel * 0.05);
  xgMult = Math.max(0.85, Math.min(1.15, xgMult));

  return {
    sentiment: rawSentiment,
    multiplier: xgMult,
    injuryLevel,
    signals,
    text
  };
}

/**
 * Fetch sentiment for a specific team
 */
export function getTeamSentiment(teamName) {
  const news = MOCK_NEWS_FEED[teamName] || "";
  return analyzeSentiment(news);
}
