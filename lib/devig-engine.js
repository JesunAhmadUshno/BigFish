/**
 * BigFish — Multi-Method Devig Engine
 * 
 * Aggregates all devigging methods and provides a unified interface
 * for extracting true probabilities from bookmaker odds.
 * Implements comparative analysis across methods.
 */

import { shinMethod, balancedBooksMethod, wpoMethod, oddsRatioMethod } from './shin-method.js';

/**
 * Run all devigging methods on a set of odds and return comparative results
 * 
 * @param {number[]} odds - Array of decimal odds (e.g., [2.10, 3.40, 3.50] for 1X2)
 * @param {string[]} [labels] - Labels for each outcome (e.g., ['Home', 'Draw', 'Away'])
 * @returns {Object} Comprehensive devigging analysis
 */
export function devigAllMethods(odds, labels = null) {
  if (!labels) {
    labels = odds.length === 2 
      ? ['Yes', 'No'] 
      : odds.length === 3 
        ? ['Home', 'Draw', 'Away'] 
        : odds.map((_, i) => `Outcome ${i + 1}`);
  }

  const shin = shinMethod(odds);
  const balanced = balancedBooksMethod(odds);
  const wpo = wpoMethod(odds);
  const oddsRatio = oddsRatioMethod(odds);

  // Calculate the consensus (average of all methods)
  const consensusProbs = odds.map((_, i) => {
    const avg = (
      shin.probabilities[i] +
      balanced.probabilities[i] +
      wpo.probabilities[i] +
      oddsRatio.probabilities[i]
    ) / 4;
    return avg;
  });

  // Normalize consensus
  const total = consensusProbs.reduce((s, p) => s + p, 0);
  const normalizedConsensus = consensusProbs.map(p => p / total);

  return {
    odds,
    labels,
    margin: shin.margin,
    methods: {
      shin: { ...shin, recommended: true },
      balanced,
      wpo,
      oddsRatio,
    },
    consensus: normalizedConsensus,
    analysis: labels.map((label, i) => ({
      outcome: label,
      decimalOdds: odds[i],
      impliedProb: (1 / odds[i] * 100).toFixed(2) + '%',
      shinProb: (shin.probabilities[i] * 100).toFixed(2) + '%',
      balancedProb: (balanced.probabilities[i] * 100).toFixed(2) + '%',
      wpoProb: (wpo.probabilities[i] * 100).toFixed(2) + '%',
      oddsRatioProb: (oddsRatio.probabilities[i] * 100).toFixed(2) + '%',
      consensusProb: (normalizedConsensus[i] * 100).toFixed(2) + '%',
    })),
  };
}

/**
 * Quick devig using Shin's method (recommended primary method)
 * 
 * @param {number[]} odds - Decimal odds
 * @returns {number[]} True probabilities
 */
export function quickDevig(odds) {
  const result = shinMethod(odds);
  return result.probabilities;
}

/**
 * Devig a 2-way market (e.g., Over/Under, BTTS)
 * @param {number} odds1 - Decimal odds for outcome 1
 * @param {number} odds2 - Decimal odds for outcome 2
 * @returns {{ prob1: number, prob2: number, margin: number }}
 */
export function devig2Way(odds1, odds2) {
  const result = shinMethod([odds1, odds2]);
  return {
    prob1: result.probabilities[0],
    prob2: result.probabilities[1],
    margin: result.margin,
  };
}

/**
 * Devig a 3-way market (1X2)
 * @param {number} homeOdds - Home win decimal odds
 * @param {number} drawOdds - Draw decimal odds
 * @param {number} awayOdds - Away win decimal odds
 * @returns {{ home: number, draw: number, away: number, margin: number, z: number }}
 */
export function devig3Way(homeOdds, drawOdds, awayOdds) {
  const result = shinMethod([homeOdds, drawOdds, awayOdds]);
  return {
    home: result.probabilities[0],
    draw: result.probabilities[1],
    away: result.probabilities[2],
    margin: result.margin,
    z: result.z,
  };
}
