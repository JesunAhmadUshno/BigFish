/**
 * BigFish — Monte Carlo Match Simulator
 * 
 * Copula-driven Monte Carlo engine that simulates matches minute-by-minute.
 * Generates joint probability distributions for Same-Game Parlay legs
 * by running tens of thousands of correlated simulations.
 * 
 * Key features:
 * - Minute-by-minute scoring rate adjustment (game state dependent)
 * - Environmental fatigue multiplier integration
 * - Correlated event generation via Gaussian Copula
 * - Full correlation matrix output for SGP pricing
 */

import { generateCorrelatedSamples, inversePoissonCDF, buildCorrelationMatrix } from './copula.js';

/**
 * Seeded pseudo-random number generator (Mulberry32)
 * Ensures reproducible simulations for testing
 */
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Simulate a single match minute-by-minute
 * Returns the full match state including goals, cards, shots
 * 
 * @param {Object} params
 * @param {number} params.homeLambda - Home team base xG (90 min)
 * @param {number} params.awayLambda - Away team base xG (90 min)
 * @param {number[]} params.homeDecayCurve - 100-element efficiency curve (0-1)
 * @param {number[]} params.awayDecayCurve - 100-element efficiency curve (0-1)
 * @param {Function} params.rng - Random number generator
 * @returns {Object} Full simulated match state
 */
function simulateMatch(params) {
  const { homeLambda, awayLambda, homeDecayCurve, awayDecayCurve, rng } = params;
  
  let homeGoals = 0, awayGoals = 0;
  let homeShots = 0, awayShots = 0;
  let homeShotsOnTarget = 0, awayShotsOnTarget = 0;
  let homeCorners = 0, awayCorners = 0;
  let homeCards = 0, awayCards = 0;
  let homeFouls = 0, awayFouls = 0;
  
  const goalMinutes = { home: [], away: [] };
  
  // Minute-by-minute simulation
  for (let minute = 1; minute <= 95; minute++) {
    const phase = minute <= 45 ? 'first' : 'second';
    const efficiency_h = homeDecayCurve ? (homeDecayCurve[Math.min(minute, 99)] || 1) : 1;
    const efficiency_a = awayDecayCurve ? (awayDecayCurve[Math.min(minute, 99)] || 1) : 1;
    
    // Adjust scoring rate based on game state
    let homeRate = (homeLambda / 90) * efficiency_h;
    let awayRate = (awayLambda / 90) * efficiency_a;
    
    // Trailing team plays more aggressively (higher variance)
    if (homeGoals < awayGoals && minute > 60) {
      homeRate *= 1.15;  // Trailing team pushes forward
      awayRate *= 1.08;  // Counter-attack opportunities
    }
    if (awayGoals < homeGoals && minute > 60) {
      awayRate *= 1.15;
      homeRate *= 1.08;
    }
    
    // Late-game fatigue increases error rates
    if (minute > 75) {
      const fatigueMultiplier = 1 + (minute - 75) * 0.008;
      homeCards += rng() < 0.004 * fatigueMultiplier ? 1 : 0;
      awayCards += rng() < 0.004 * fatigueMultiplier ? 1 : 0;
    }
    
    // Goal events
    if (rng() < homeRate) {
      homeGoals++;
      goalMinutes.home.push(minute);
    }
    if (rng() < awayRate) {
      awayGoals++;
      goalMinutes.away.push(minute);
    }
    
    // Shot events (correlated with scoring rate)
    if (rng() < homeRate * 3.5) {
      homeShots++;
      if (rng() < 0.35) homeShotsOnTarget++;
    }
    if (rng() < awayRate * 3.5) {
      awayShots++;
      if (rng() < 0.35) awayShotsOnTarget++;
    }
    
    // Corner events
    if (rng() < 0.055 * efficiency_h) homeCorners++;
    if (rng() < 0.048 * efficiency_a) awayCorners++;
    
    // Foul events
    if (rng() < 0.12) homeFouls++;
    if (rng() < 0.12) awayFouls++;
    
    // Card events from fouls
    if (rng() < 0.003) homeCards++;
    if (rng() < 0.003) awayCards++;
  }
  
  return {
    homeGoals, awayGoals,
    homeShots, awayShots,
    homeShotsOnTarget, awayShotsOnTarget,
    homeCorners, awayCorners,
    homeCards, awayCards,
    homeFouls, awayFouls,
    totalGoals: homeGoals + awayGoals,
    totalCorners: homeCorners + awayCorners,
    totalCards: homeCards + awayCards,
    goalMinutes,
    result: homeGoals > awayGoals ? 'home' : homeGoals < awayGoals ? 'away' : 'draw',
    btts: homeGoals > 0 && awayGoals > 0,
  };
}

/**
 * Run full Monte Carlo simulation
 * 
 * @param {Object} params
 * @param {number} params.homeLambda - Home xG
 * @param {number} params.awayLambda - Away xG
 * @param {number} [params.iterations=10000] - Number of simulations (use 10K for web, 100K for accuracy)
 * @param {number[]} [params.homeDecayCurve] - Environmental decay curve for home team
 * @param {number[]} [params.awayDecayCurve] - Environmental decay curve for away team
 * @param {number} [params.seed] - Random seed for reproducibility
 * @returns {Object} Full simulation results with distributions
 */
export function runMonteCarloSimulation({
  homeLambda,
  awayLambda,
  iterations = 10000,
  homeDecayCurve = null,
  awayDecayCurve = null,
  seed = null,
}) {
  const rng = seed !== null ? mulberry32(seed) : Math.random;
  
  // Store all simulation results
  const results = [];
  const scorelines = {};
  let homeWins = 0, draws = 0, awayWins = 0;
  let bttsYes = 0;
  const overCounts = { 0.5: 0, 1.5: 0, 2.5: 0, 3.5: 0, 4.5: 0, 5.5: 0 };
  
  // Aggregators for correlation matrix
  const aggregates = {
    homeGoals: [], awayGoals: [], totalGoals: [],
    homeShots: [], awayShots: [],
    homeShotsOnTarget: [], awayShotsOnTarget: [],
    homeCorners: [], awayCorners: [], totalCorners: [],
    homeCards: [], awayCards: [], totalCards: [],
  };
  
  for (let i = 0; i < iterations; i++) {
    const result = simulateMatch({
      homeLambda, awayLambda,
      homeDecayCurve, awayDecayCurve,
      rng,
    });
    
    results.push(result);
    
    // Count results
    if (result.result === 'home') homeWins++;
    else if (result.result === 'draw') draws++;
    else awayWins++;
    
    if (result.btts) bttsYes++;
    
    // Scoreline tracking
    const key = `${result.homeGoals}-${result.awayGoals}`;
    scorelines[key] = (scorelines[key] || 0) + 1;
    
    // Over/under tracking
    Object.keys(overCounts).forEach(line => {
      if (result.totalGoals > parseFloat(line)) overCounts[line]++;
    });
    
    // Store for correlation analysis
    Object.keys(aggregates).forEach(key => {
      aggregates[key].push(result[key]);
    });
  }
  
  // Calculate correlation matrix
  const correlationMatrix = calculateCorrelationMatrix(aggregates);
  
  // Build probability distributions
  const n = iterations;
  const scorelineProbs = {};
  Object.entries(scorelines).forEach(([key, count]) => {
    scorelineProbs[key] = count / n;
  });
  
  // Sort scorelines by probability
  const sortedScorelines = Object.entries(scorelineProbs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([score, prob]) => ({
      score,
      probability: prob,
      percentage: (prob * 100).toFixed(2) + '%',
    }));
  
  return {
    iterations,
    probabilities: {
      home: homeWins / n,
      draw: draws / n,
      away: awayWins / n,
    },
    btts: {
      yes: bttsYes / n,
      no: 1 - bttsYes / n,
    },
    overUnder: Object.fromEntries(
      Object.entries(overCounts).map(([line, count]) => [
        line,
        { over: count / n, under: 1 - count / n },
      ])
    ),
    scorelines: sortedScorelines,
    correlationMatrix,
    averages: {
      homeGoals: avg(aggregates.homeGoals),
      awayGoals: avg(aggregates.awayGoals),
      totalGoals: avg(aggregates.totalGoals),
      homeShots: avg(aggregates.homeShots),
      awayShots: avg(aggregates.awayShots),
      totalCorners: avg(aggregates.totalCorners),
      totalCards: avg(aggregates.totalCards),
    },
  };
}

/**
 * Calculate Pearson correlation matrix from aggregate data
 */
function calculateCorrelationMatrix(aggregates) {
  const keys = Object.keys(aggregates);
  const matrix = {};
  
  for (let i = 0; i < keys.length; i++) {
    for (let j = i; j < keys.length; j++) {
      const corr = pearsonCorrelation(aggregates[keys[i]], aggregates[keys[j]]);
      const key = `${keys[i]}_vs_${keys[j]}`;
      matrix[key] = Math.round(corr * 1000) / 1000;
    }
  }
  
  return matrix;
}

/**
 * Pearson correlation coefficient
 */
function pearsonCorrelation(x, y) {
  const n = x.length;
  if (n === 0) return 0;
  
  const meanX = avg(x);
  const meanY = avg(y);
  
  let sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }
  
  const denom = Math.sqrt(sumX2 * sumY2);
  return denom === 0 ? 0 : sumXY / denom;
}

/**
 * Average of array
 */
function avg(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/**
 * Calculate joint probability of multiple parlay legs from simulation results
 * 
 * @param {Object[]} results - Array of simulation results
 * @param {Object[]} legs - Array of parlay leg conditions
 * @returns {number} Joint probability
 */
export function calculateJointProbability(results, legs) {
  let hits = 0;
  
  for (const result of results) {
    let allLegsMet = true;
    
    for (const leg of legs) {
      if (!evaluateLeg(result, leg)) {
        allLegsMet = false;
        break;
      }
    }
    
    if (allLegsMet) hits++;
  }
  
  return hits / results.length;
}

/**
 * Evaluate whether a single parlay leg is met in a simulation result
 */
function evaluateLeg(result, leg) {
  switch (leg.type) {
    case 'moneyline':
      return result.result === leg.value;
    case 'over':
      return result.totalGoals > leg.line;
    case 'under':
      return result.totalGoals <= leg.line;
    case 'btts_yes':
      return result.btts === true;
    case 'btts_no':
      return result.btts === false;
    case 'home_over':
      return result.homeGoals > leg.line;
    case 'away_over':
      return result.awayGoals > leg.line;
    case 'total_corners_over':
      return result.totalCorners > leg.line;
    case 'total_cards_over':
      return result.totalCards > leg.line;
    case 'home_shots_on_target_over':
      return result.homeShotsOnTarget > leg.line;
    case 'away_shots_on_target_over':
      return result.awayShotsOnTarget > leg.line;
    case 'correct_score':
      return result.homeGoals === leg.homeGoals && result.awayGoals === leg.awayGoals;
    default:
      return false;
  }
}
