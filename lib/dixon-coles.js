/**
 * BigFish — Dixon-Coles Bivariate Poisson Model
 * 
 * Implements the foundational Dixon-Coles (1997) model for predicting
 * football match scorelines. Key innovations over independent Poisson:
 * 
 * 1. τ (tau) correction factor for low-score interdependence
 * 2. Time-decay weighting (exponential, prioritizing recent form)
 * 3. Bivariate correlation parameter ρ (rho)
 * 
 * References:
 * - Dixon & Coles (1997) "Modelling Association Football Scores and
 *   Inefficiencies in the Football Betting Market"
 * - Maher (1982) independent Poisson baseline
 */

import { DIXON_COLES_DEFAULTS } from './constants.js';

/**
 * Poisson probability mass function
 * P(X = k) = (λ^k * e^(-λ)) / k!
 */
function poissonPMF(k, lambda) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) {
    logP -= Math.log(i);
  }
  return Math.exp(logP);
}

/**
 * Dixon-Coles τ (tau) correction factor
 * Adjusts joint probability for low-scoring outcomes (0-0, 1-0, 0-1, 1-1)
 * to account for the interdependence that independent Poisson models miss.
 * 
 * @param {number} x - Home goals
 * @param {number} y - Away goals
 * @param {number} lambda - Home expected goals
 * @param {number} mu - Away expected goals
 * @param {number} rho - Bivariate correlation parameter
 * @returns {number} Correction factor τ(x,y,λ,μ,ρ)
 */
function tauCorrection(x, y, lambda, mu, rho) {
  if (x === 0 && y === 0) {
    return 1 - lambda * mu * rho;
  }
  if (x === 0 && y === 1) {
    return 1 + lambda * rho;
  }
  if (x === 1 && y === 0) {
    return 1 + mu * rho;
  }
  if (x === 1 && y === 1) {
    return 1 - rho;
  }
  return 1.0; // No correction for higher scores
}

/**
 * Calculate the joint probability of a specific scoreline
 * using the Dixon-Coles bivariate Poisson model.
 * 
 * P(X=x, Y=y) = τ(x,y,λ,μ,ρ) × Poisson(x,λ) × Poisson(y,μ)
 * 
 * @param {number} homeGoals - Home team goals
 * @param {number} awayGoals - Away team goals
 * @param {number} lambda - Home team expected goals (xG)
 * @param {number} mu - Away team expected goals (xG)
 * @param {number} rho - Bivariate correlation parameter
 * @returns {number} Joint probability
 */
export function scorelineProbability(homeGoals, awayGoals, lambda, mu, rho) {
  const tau = tauCorrection(homeGoals, awayGoals, lambda, mu, rho);
  const pHome = poissonPMF(homeGoals, lambda);
  const pAway = poissonPMF(awayGoals, mu);
  return tau * pHome * pAway;
}

/**
 * Generate the full scoreline probability matrix
 * Returns a 2D array where matrix[i][j] = P(Home=i, Away=j)
 * 
 * @param {number} lambda - Home xG
 * @param {number} mu - Away xG
 * @param {number} rho - Bivariate correlation
 * @param {number} maxGoals - Maximum goals to model (default 10)
 * @returns {number[][]} Probability matrix
 */
export function generateScorelineMatrix(lambda, mu, rho, maxGoals = DIXON_COLES_DEFAULTS.MAX_GOALS) {
  const matrix = [];
  for (let i = 0; i <= maxGoals; i++) {
    matrix[i] = [];
    for (let j = 0; j <= maxGoals; j++) {
      matrix[i][j] = scorelineProbability(i, j, lambda, mu, rho);
    }
  }
  return matrix;
}

/**
 * Derive 1X2 probabilities from the scoreline matrix
 * 
 * @param {number[][]} matrix - Scoreline probability matrix
 * @returns {{ home: number, draw: number, away: number }}
 */
export function derive1X2(matrix) {
  let home = 0, draw = 0, away = 0;
  const n = matrix.length;
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const p = matrix[i][j];
      if (i > j) home += p;
      else if (i === j) draw += p;
      else away += p;
    }
  }

  // Normalize to ensure they sum to 1
  const total = home + draw + away;
  return {
    home: home / total,
    draw: draw / total,
    away: away / total,
  };
}

/**
 * Calculate expected goals (xG) parameters from team strengths
 * Uses Elo-based attack/defense estimation
 * 
 * @param {number} homeElo - Home team Elo rating
 * @param {number} awayElo - Away team Elo rating
 * @param {number} leagueAvgGoals - Average goals per team per match (default 1.35)
 * @param {number} homeAdvantage - Home advantage parameter
 * @returns {{ lambda: number, mu: number }} Expected goals for both teams
 */
export function calculateExpectedGoals(
  homeElo,
  awayElo,
  leagueAvgGoals = 1.35,
  homeAdvantage = DIXON_COLES_DEFAULTS.HOME_ADVANTAGE
) {
  // Elo difference → expected score difference
  const eloDiff = homeElo - awayElo;
  
  // Convert Elo to expected score multiplier
  // Based on the Elo formula: E = 1 / (1 + 10^(-d/400))
  const homeExpected = 1 / (1 + Math.pow(10, -eloDiff / 400));
  const awayExpected = 1 - homeExpected;
  
  // Scale to goal expectations with home advantage
  const lambda = leagueAvgGoals * (1 + homeAdvantage) * (homeExpected / 0.5);
  const mu = leagueAvgGoals * (1 - homeAdvantage * 0.5) * (awayExpected / 0.5);
  
  // Clamp to reasonable range
  return {
    lambda: Math.max(0.3, Math.min(4.5, lambda)),
    mu: Math.max(0.2, Math.min(4.0, mu)),
  };
}

/**
 * Apply time-decay weighting to historical match data
 * More recent matches receive exponentially higher weight
 * 
 * @param {Array} matches - Array of historical match objects with `date` property
 * @param {number} decayRate - Exponential decay rate ξ (default from constants)
 * @returns {Array} Matches with `weight` property added
 */
export function applyTimeDecay(matches, decayRate = DIXON_COLES_DEFAULTS.TIME_DECAY_RATE) {
  const now = Date.now();
  return matches.map(match => {
    const daysAgo = (now - new Date(match.date).getTime()) / (1000 * 60 * 60 * 24);
    const weight = Math.exp(-decayRate * daysAgo);
    return { ...match, weight };
  });
}

/**
 * Apply environmental adjustment to expected goals
 * Integrates physiometric agent outputs into the Dixon-Coles model
 * 
 * @param {number} baseXG - Base expected goals from Dixon-Coles
 * @param {number} efficiencyMultiplier - From physiometric agent (0-1)
 * @param {boolean} isHighAltitudeTeam - Whether team is accustomed to altitude
 * @param {number} altitudeAdvantage - Additional xG from altitude advantage
 * @returns {number} Adjusted expected goals
 */
export function adjustXGForEnvironment(baseXG, efficiencyMultiplier, isHighAltitudeTeam = false, altitudeAdvantage = 0) {
  let adjusted = baseXG * efficiencyMultiplier;
  if (isHighAltitudeTeam) {
    adjusted += altitudeAdvantage;
  }
  return Math.max(0.15, adjusted);
}

/**
 * Get the most likely scorelines from the probability matrix
 * 
 * @param {number[][]} matrix - Scoreline probability matrix
 * @param {number} topN - Number of results to return
 * @returns {Array<{ home: number, away: number, probability: number }>}
 */
export function getMostLikelyScorelines(matrix, topN = 10) {
  const scorelines = [];
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      scorelines.push({
        home: i,
        away: j,
        probability: matrix[i][j],
      });
    }
  }
  scorelines.sort((a, b) => b.probability - a.probability);
  return scorelines.slice(0, topN);
}

/**
 * Calculate Team Total Over/Under 1.5 Goals
 * @param {number} teamLambda The team's Expected Goals (xG)
 * @returns {object} { over1_5: number, under1_5: number }
 */
export function calculateTeamTotals(teamLambda) {
  // P(X=0) = e^(-λ)
  const p0 = Math.exp(-teamLambda);
  // P(X=1) = λ * e^(-λ)
  const p1 = teamLambda * Math.exp(-teamLambda);
  const under1_5 = p0 + p1;
  const over1_5 = 1 - under1_5;
  
  return { over1_5, under1_5 };
}

/**
 * Full Dixon-Coles prediction for a match
 * 
 * @param {Object} params
 * @param {number} params.homeElo - Home team Elo
 * @param {number} params.awayElo - Away team Elo
 * @param {number} [params.rho] - Bivariate correlation
 * @param {number} [params.envMultiplierHome] - Environmental efficiency (home)
 * @param {number} [params.envMultiplierAway] - Environmental efficiency (away)
 * @returns {Object} Full prediction object
 */
export function predictMatch({
  homeElo,
  awayElo,
  rho = DIXON_COLES_DEFAULTS.RHO_INITIAL,
  envMultiplierHome = 1.0,
  envMultiplierAway = 1.0,
}) {
  // Calculate base expected goals
  const { lambda: baseLambda, mu: baseMu } = calculateExpectedGoals(homeElo, awayElo);
  
  // Apply environmental adjustments
  const lambda = adjustXGForEnvironment(baseLambda, envMultiplierHome);
  const mu = adjustXGForEnvironment(baseMu, envMultiplierAway);
  
  // Generate scoreline matrix
  const matrix = generateScorelineMatrix(lambda, mu, rho);
  
  // Derive 1X2 probabilities
  const probabilities1X2 = derive1X2(matrix);
  
  // Get top scorelines
  const topScorelines = getMostLikelyScorelines(matrix, 15);
  
  // Calculate over/under probabilities for common lines
  const overUnder = {};
  [1.5, 2.5, 3.5, 4.5].forEach(line => {
    let over = 0;
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[i].length; j++) {
        if (i + j > line) over += matrix[i][j];
      }
    }
    overUnder[line] = { over, under: 1 - over };
  });
  
  // Both Teams To Score
  let btts = 0;
  for (let i = 1; i < matrix.length; i++) {
    for (let j = 1; j < matrix[i].length; j++) {
      btts += matrix[i][j];
    }
  }

  // Team Totals
  const teamTotals = {
    home: calculateTeamTotals(lambda),
    away: calculateTeamTotals(mu)
  };
  
  return {
    parameters: { lambda, mu, rho },
    probabilities1X2,
    topScorelines,
    overUnder,
    btts: { yes: btts, no: 1 - btts },
    teamTotals,
    matrix,
  };
}
