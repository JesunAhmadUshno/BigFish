/**
 * BigFish — Shin's Method for True Probability Extraction
 * 
 * Implements Shin's (1992, 1993) model for removing bookmaker margin
 * to reveal true implied probabilities. Uses the iterative Jullien & 
 * Salanié (1994) algorithm.
 * 
 * Key concept: Bookmakers adjust odds assuming a proportion z of
 * bettors are "insiders" with perfect knowledge. By estimating z,
 * we can reverse-engineer the true probabilities.
 * 
 * References:
 * - Shin (1992, 1993) insider trading model
 * - Jullien & Salanié (1994) iterative algorithm
 * - mberk/shin GitHub implementation
 */

import { MARKET_CONSTANTS } from './constants.js';

/**
 * Calculate implied probabilities from decimal odds (naive normalization)
 * @param {number[]} odds - Array of decimal odds
 * @returns {number[]} Implied probabilities (sum > 1 due to margin)
 */
export function impliedProbabilities(odds) {
  return odds.map(o => 1 / o);
}

/**
 * Calculate the overround (margin/vig) from odds
 * @param {number[]} odds - Array of decimal odds
 * @returns {number} Overround (e.g., 1.05 means 5% margin)
 */
export function calculateOverround(odds) {
  return odds.reduce((sum, o) => sum + 1 / o, 0);
}

/**
 * Shin's Method — Core Implementation
 * 
 * Iteratively solves for the insider proportion z using the
 * Jullien & Salanié (1994) algorithm. The true probability for
 * outcome i is:
 * 
 *   p_i = (√(z² + 4(1-z) × (π_i²/Σπ_j²)) - z) / (2(1-z))
 * 
 * where π_i is the raw implied probability from odds.
 * 
 * @param {number[]} odds - Array of decimal odds (e.g., [2.10, 3.40, 3.50])
 * @param {number} [maxIterations] - Maximum iterations for convergence
 * @param {number} [convergenceThreshold] - Convergence threshold
 * @returns {{ probabilities: number[], z: number, margin: number }}
 */
export function shinMethod(
  odds,
  maxIterations = MARKET_CONSTANTS.SHIN_MAX_ITERATIONS,
  convergenceThreshold = MARKET_CONSTANTS.SHIN_CONVERGENCE_THRESHOLD
) {
  const n = odds.length;
  const implied = impliedProbabilities(odds);
  const overround = calculateOverround(odds);
  
  // Initial estimate of z (insider proportion)
  let z = (overround - 1) / (n - 1); // Simple initial estimate
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const prevZ = z;
    
    // Calculate sum of squared implied probabilities
    const sumSquared = implied.reduce((s, p) => s + p * p, 0);
    
    // Calculate Shin probabilities for current z
    const shinProbs = implied.map(pi => {
      const discriminant = z * z + 4 * (1 - z) * (pi * pi / sumSquared);
      return (Math.sqrt(discriminant) - z) / (2 * (1 - z));
    });
    
    // Update z: z = (sum(p_i²) - 1) / (n - 1) ... using optimization
    const sumShinSquared = shinProbs.reduce((s, p) => s + p * p, 0);
    
    // Jullien & Salanié update rule
    // z is found where sum of shin probabilities = 1
    const totalProb = shinProbs.reduce((s, p) => s + p, 0);
    
    // Adjust z to make probabilities sum to 1
    // Binary search for optimal z
    let lo = 0, hi = 1;
    for (let bs = 0; bs < 100; bs++) {
      const mid = (lo + hi) / 2;
      const testProbs = implied.map(pi => {
        const disc = mid * mid + 4 * (1 - mid) * (pi * pi / sumSquared);
        return (Math.sqrt(disc) - mid) / (2 * (1 - mid));
      });
      const testSum = testProbs.reduce((s, p) => s + p, 0);
      if (testSum > 1) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    z = (lo + hi) / 2;
    
    if (Math.abs(z - prevZ) < convergenceThreshold) {
      break;
    }
  }
  
  // Final probability calculation with converged z
  const sumSquared = implied.reduce((s, p) => s + p * p, 0);
  const probabilities = implied.map(pi => {
    const discriminant = z * z + 4 * (1 - z) * (pi * pi / sumSquared);
    return (Math.sqrt(discriminant) - z) / (2 * (1 - z));
  });
  
  // Normalize to ensure exact sum of 1
  const total = probabilities.reduce((s, p) => s + p, 0);
  const normalized = probabilities.map(p => p / total);
  
  return {
    probabilities: normalized,
    z: z,
    margin: overround - 1,
    method: 'shin',
  };
}

/**
 * Balanced Books Method (Fingleton & Waldron 1999)
 * Assumes bookmaker minimizes risk rather than maximizing profit.
 * Distributes margin proportional to implied probabilities.
 * 
 * @param {number[]} odds - Decimal odds
 * @returns {{ probabilities: number[], margin: number }}
 */
export function balancedBooksMethod(odds) {
  const implied = impliedProbabilities(odds);
  const overround = implied.reduce((s, p) => s + p, 0);
  const probabilities = implied.map(p => p / overround);
  
  return {
    probabilities,
    margin: overround - 1,
    method: 'balanced',
  };
}

/**
 * WPO Method — Margin Weights Proportional to Odds
 * Addresses the favorite-longshot bias by applying non-linear
 * margin adjustments. Favorites carry less of the margin weight.
 * 
 * @param {number[]} odds - Decimal odds
 * @returns {{ probabilities: number[], margin: number }}
 */
export function wpoMethod(odds) {
  const n = odds.length;
  const implied = impliedProbabilities(odds);
  const overround = implied.reduce((s, p) => s + p, 0);
  const margin = overround - 1;
  
  // Weight margin proportional to odds (higher odds = more margin)
  const totalOdds = odds.reduce((s, o) => s + o, 0);
  const weights = odds.map(o => o / totalOdds);
  
  const probabilities = implied.map((p, i) => {
    return p - margin * weights[i];
  });
  
  // Normalize
  const total = probabilities.reduce((s, p) => s + p, 0);
  const normalized = probabilities.map(p => Math.max(0.001, p / total));
  
  return {
    probabilities: normalized,
    margin,
    method: 'wpo',
  };
}

/**
 * Odds Ratio Method
 * Uses logarithmic transformation to address favorite-longshot bias
 * through a non-linear normalization approach.
 * 
 * @param {number[]} odds - Decimal odds
 * @returns {{ probabilities: number[], margin: number }}
 */
export function oddsRatioMethod(odds) {
  const implied = impliedProbabilities(odds);
  const overround = implied.reduce((s, p) => s + p, 0);
  const n = odds.length;
  
  // Find the odds ratio parameter c that makes probabilities sum to 1
  // p_i = c × π_i / (1 + (c-1) × π_i)
  let lo = 0.01, hi = 100;
  
  for (let iter = 0; iter < 200; iter++) {
    const mid = (lo + hi) / 2;
    const testProbs = implied.map(pi => {
      return (mid * pi) / (1 + (mid - 1) * pi);
    });
    const testSum = testProbs.reduce((s, p) => s + p, 0);
    
    if (testSum > 1) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  
  const c = (lo + hi) / 2;
  const probabilities = implied.map(pi => {
    return (c * pi) / (1 + (c - 1) * pi);
  });
  
  // Normalize
  const total = probabilities.reduce((s, p) => s + p, 0);
  const normalized = probabilities.map(p => p / total);
  
  return {
    probabilities: normalized,
    margin: overround - 1,
    method: 'odds_ratio',
  };
}

/**
 * Basic Normalization (baseline comparison)
 * Simply divides implied probabilities by their sum.
 * 
 * @param {number[]} odds - Decimal odds
 * @returns {{ probabilities: number[], margin: number }}
 */
export function basicNormalization(odds) {
  return balancedBooksMethod(odds); // Mathematically equivalent
}
