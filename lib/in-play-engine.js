/**
 * BigFish — In-Play Live Probability Engine
 * 
 * Recalculates match probabilities in real-time during live matches
 * by applying linear time-decay to the remaining Expected Goals.
 * 
 * Core principle: As time elapses, the remaining xG budget shrinks linearly.
 * A goal changes the state dramatically (e.g., trailing team needs to overcome
 * a larger deficit with fewer remaining xG).
 * 
 * Formula:
 *   remaining_xG = base_xG × (90 - elapsed) / 90
 *   Adjusted for current score state using conditional probability
 * 
 * References:
 * - Dixon & Robinson (1998) "A Birth Process Model for Association Football Matches"
 * - Robberechts et al. (2021) "Bayesian in-play prediction"
 */

import { generateScorelineMatrix, derive1X2 } from './dixon-coles.js';
import { DIXON_COLES_DEFAULTS } from './constants.js';

/**
 * Calculate remaining xG based on elapsed time
 * @param {number} baseXG - Pre-match expected goals
 * @param {number} minuteElapsed - Current match minute (0-90+)
 * @returns {number} Remaining xG for the rest of the match
 */
export function remainingXG(baseXG, minuteElapsed) {
  const totalMinutes = 90;
  const remaining = Math.max(0, totalMinutes - Math.min(minuteElapsed, totalMinutes));
  return baseXG * (remaining / totalMinutes);
}

/**
 * Apply red card adjustment to a team's remaining xG
 * A red card reduces the affected team's xG by ~20% and boosts opponent by ~10%
 * 
 * @param {number} teamXG - Team's remaining xG
 * @param {number} redCards - Number of red cards the team has received
 * @returns {number} Adjusted xG
 */
export function applyRedCardAdjustment(teamXG, redCards) {
  const reductionPerCard = 0.20; // 20% reduction per red card
  return teamXG * Math.pow(1 - reductionPerCard, redCards);
}

/**
 * Calculate live in-play probabilities
 * 
 * @param {Object} params
 * @param {number} params.baseLambda - Pre-match home xG
 * @param {number} params.baseMu - Pre-match away xG
 * @param {number} params.rho - Dixon-Coles correlation parameter
 * @param {number} params.minuteElapsed - Current match minute
 * @param {number} params.homeScore - Current home goals
 * @param {number} params.awayScore - Current away goals
 * @param {number} [params.homeRedCards] - Home team red cards
 * @param {number} [params.awayRedCards] - Away team red cards
 * @returns {Object} Live probabilities and analytics
 */
export function calculateInPlayProbabilities({
  baseLambda,
  baseMu,
  rho = DIXON_COLES_DEFAULTS.RHO_INITIAL,
  minuteElapsed,
  homeScore = 0,
  awayScore = 0,
  homeRedCards = 0,
  awayRedCards = 0,
}) {
  // Calculate remaining xG
  let remLambda = remainingXG(baseLambda, minuteElapsed);
  let remMu = remainingXG(baseMu, minuteElapsed);

  // Apply red card adjustments
  remLambda = applyRedCardAdjustment(remLambda, homeRedCards);
  remMu = applyRedCardAdjustment(remMu, awayRedCards);

  // Boost opponent xG slightly for each red card
  remLambda *= Math.pow(1.10, awayRedCards); // Home benefits from away red cards
  remMu *= Math.pow(1.10, homeRedCards);     // Away benefits from home red cards

  // Generate remaining-time scoreline matrix
  const remainingMatrix = generateScorelineMatrix(remLambda, remMu, rho, 6);

  // Calculate final score probabilities (current score + remaining goals)
  let homeWin = 0, draw = 0, awayWin = 0;

  for (let addHome = 0; addHome < remainingMatrix.length; addHome++) {
    for (let addAway = 0; addAway < remainingMatrix[addHome].length; addAway++) {
      const finalHome = homeScore + addHome;
      const finalAway = awayScore + addAway;
      const p = remainingMatrix[addHome][addAway];

      if (finalHome > finalAway) homeWin += p;
      else if (finalHome === finalAway) draw += p;
      else awayWin += p;
    }
  }

  // Normalize
  const total = homeWin + draw + awayWin;
  homeWin /= total;
  draw /= total;
  awayWin /= total;

  // Next goal probabilities
  const pNoMoreGoals = remainingMatrix[0][0];
  const totalNextGoalProb = 1 - pNoMoreGoals;
  let homeNextGoal = 0;
  for (let i = 1; i < remainingMatrix.length; i++) {
    homeNextGoal += remainingMatrix[i][0];
  }
  let awayNextGoal = 0;
  for (let j = 1; j < remainingMatrix[0].length; j++) {
    awayNextGoal += remainingMatrix[0][j];
  }
  const nextGoalTotal = homeNextGoal + awayNextGoal;

  // Over/Under remaining goals
  let overRemaining = {};
  [0.5, 1.5, 2.5].forEach(line => {
    let over = 0;
    for (let i = 0; i < remainingMatrix.length; i++) {
      for (let j = 0; j < remainingMatrix[i].length; j++) {
        if (i + j > line) over += remainingMatrix[i][j];
      }
    }
    overRemaining[line] = { over, under: 1 - over };
  });

  return {
    probabilities: { home: homeWin, draw, away: awayWin },
    nextGoal: {
      home: nextGoalTotal > 0 ? homeNextGoal / nextGoalTotal : 0.5,
      away: nextGoalTotal > 0 ? awayNextGoal / nextGoalTotal : 0.5,
      noMoreGoals: pNoMoreGoals,
    },
    overUnderRemaining: overRemaining,
    remainingXG: { home: remLambda, away: remMu },
    matchState: {
      minute: minuteElapsed,
      score: `${homeScore}-${awayScore}`,
      homeRedCards,
      awayRedCards,
      phase: minuteElapsed <= 45 ? 'FIRST_HALF' : minuteElapsed <= 90 ? 'SECOND_HALF' : 'EXTRA_TIME',
    },
  };
}
