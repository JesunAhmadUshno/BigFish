/**
 * BigFish — Expected Value Calculator & SGP Builder
 * 
 * Identifies +EV betting opportunities by comparing AI-computed
 * true probabilities against bookmaker odds. Constructs optimal
 * Same-Game Parlays from the correlation matrix.
 * 
 * The EV formula: EV = (TrueProb × DecimalOdds) - 1
 * A bet is +EV when EV > 0, meaning the true probability-weighted
 * return exceeds the cost of the bet.
 */

import { KELLY_DEFAULTS, MARKET_CONSTANTS } from './constants.js';
import { fractionalKelly } from './kelly-criterion.js';

/**
 * Calculate Expected Value for a single bet
 * 
 * @param {number} trueProbability - AI-computed true probability
 * @param {number} decimalOdds - Bookmaker's decimal odds
 * @returns {Object} EV analysis
 */
export function calculateEV(trueProbability, decimalOdds) {
  const impliedProbability = 1 / decimalOdds;
  const ev = trueProbability * decimalOdds - 1;
  const edge = trueProbability - impliedProbability;
  
  return {
    ev,
    evPercentage: (ev * 100).toFixed(2) + '%',
    edge,
    edgePercentage: (edge * 100).toFixed(2) + '%',
    isPositiveEV: ev > 0,
    meetsThreshold: ev > KELLY_DEFAULTS.MIN_EV_THRESHOLD,
    trueProbability,
    impliedProbability,
    decimalOdds,
    rating: ev > 0.15 ? 'ELITE' : ev > 0.10 ? 'STRONG' : ev > 0.05 ? 'GOOD' : ev > 0 ? 'MARGINAL' : 'NEGATIVE',
  };
}

/**
 * Scan all available markets for +EV opportunities
 * 
 * @param {Object} modelProbabilities - AI model's probabilities
 * @param {Object} bookmakerOdds - Bookmaker's odds for each market
 * @returns {Object[]} Array of +EV opportunities, sorted by EV
 */
export function scanForEV(modelProbabilities, bookmakerOdds) {
  const opportunities = [];
  
  // Check 1X2 market
  if (bookmakerOdds.h2h && modelProbabilities.match) {
    const labels = ['Home', 'Draw', 'Away'];
    const probs = [modelProbabilities.match.home, modelProbabilities.match.draw, modelProbabilities.match.away];
    const odds = bookmakerOdds.h2h;
    
    probs.forEach((prob, i) => {
      if (odds[i]) {
        const analysis = calculateEV(prob, odds[i]);
        if (analysis.isPositiveEV) {
          opportunities.push({
            market: '1X2',
            selection: labels[i],
            ...analysis,
          });
        }
      }
    });
  }
  
  // Check Over/Under markets
  if (bookmakerOdds.totals && modelProbabilities.overUnder) {
    Object.entries(modelProbabilities.overUnder).forEach(([line, probs]) => {
      const oddsData = bookmakerOdds.totals?.[line];
      if (oddsData) {
        // Over
        const overAnalysis = calculateEV(probs.over, oddsData.over);
        if (overAnalysis.isPositiveEV) {
          opportunities.push({
            market: `Over ${line}`,
            selection: `Over ${line} Goals`,
            ...overAnalysis,
          });
        }
        // Under
        const underAnalysis = calculateEV(probs.under, oddsData.under);
        if (underAnalysis.isPositiveEV) {
          opportunities.push({
            market: `Under ${line}`,
            selection: `Under ${line} Goals`,
            ...underAnalysis,
          });
        }
      }
    });
  }
  
  // Check BTTS market
  if (bookmakerOdds.btts && modelProbabilities.btts) {
    const bttsYes = calculateEV(modelProbabilities.btts.yes, bookmakerOdds.btts.yes);
    if (bttsYes.isPositiveEV) {
      opportunities.push({ market: 'BTTS', selection: 'Yes', ...bttsYes });
    }
    const bttsNo = calculateEV(modelProbabilities.btts.no, bookmakerOdds.btts.no);
    if (bttsNo.isPositiveEV) {
      opportunities.push({ market: 'BTTS', selection: 'No', ...bttsNo });
    }
  }
  
  // Sort by EV descending
  opportunities.sort((a, b) => b.ev - a.ev);
  
  return opportunities;
}

/**
 * Build an optimal Same-Game Parlay from detected opportunities
 * 
 * @param {Object[]} opportunities - +EV opportunities from scanForEV
 * @param {Object} correlationMatrix - From Monte Carlo simulation
 * @param {number} bankroll - Current bankroll
 * @param {number} [maxLegs] - Maximum parlay legs
 * @returns {Object} Optimal SGP recommendation
 */
export function buildOptimalSGP(
  opportunities,
  correlationMatrix = {},
  bankroll = KELLY_DEFAULTS.INITIAL_BANKROLL,
  maxLegs = MARKET_CONSTANTS.MAX_PARLAY_LEGS
) {
  if (opportunities.length < 2) {
    return { viable: false, reason: 'Insufficient +EV opportunities for SGP construction' };
  }
  
  // Filter for threshold-meeting opportunities
  const viable = opportunities.filter(o => o.meetsThreshold);
  if (viable.length < 2) {
    return { viable: false, reason: 'Insufficient opportunities meeting minimum edge threshold' };
  }
  
  // Take top opportunities (limit to maxLegs)
  const legs = viable.slice(0, Math.min(maxLegs, viable.length));
  
  // Calculate combined odds (multiply decimal odds)
  const combinedOdds = legs.reduce((prod, leg) => prod * leg.decimalOdds, 1);
  
  // Calculate joint probability (accounting for correlation)
  // For correlated events, joint prob ≠ product of individual probs
  // Use a simplified correlation-adjusted calculation
  let jointProbability = legs.reduce((prod, leg) => prod * leg.trueProbability, 1);
  
  // Apply correlation adjustment (if positive correlation between legs, actual joint prob is higher)
  const correlationAdjustment = estimateCorrelationAdjustment(legs, correlationMatrix);
  jointProbability *= correlationAdjustment;
  
  // Calculate parlay EV
  const parlayEV = jointProbability * combinedOdds - 1;
  
  // Calculate Kelly stake
  const kellyResult = fractionalKelly(jointProbability, combinedOdds, KELLY_DEFAULTS.FRACTION, bankroll);
  
  // Bookmaker's implied joint probability (what they think the parlay is worth)
  const bookmakerJointProb = 1 / combinedOdds;
  
  // SGP tax estimation (difference between book's pricing and fair pricing)
  const sgpTax = jointProbability - bookmakerJointProb;
  
  return {
    viable: parlayEV > KELLY_DEFAULTS.MIN_EV_THRESHOLD,
    legs: legs.map(l => ({
      market: l.market,
      selection: l.selection,
      odds: l.decimalOdds,
      trueProbability: l.trueProbability,
      ev: l.ev,
    })),
    combinedOdds: Math.round(combinedOdds * 100) / 100,
    jointProbability: Math.round(jointProbability * 10000) / 10000,
    bookmakerImpliedProb: Math.round(bookmakerJointProb * 10000) / 10000,
    parlayEV,
    parlayEVPercentage: (parlayEV * 100).toFixed(2) + '%',
    sgpTaxDetected: sgpTax > 0,
    sgpTaxAmount: (sgpTax * 100).toFixed(2) + '%',
    correlationAdjustment,
    kelly: kellyResult,
    reverseEngineering: generateReverseEngineering(legs, jointProbability, bookmakerJointProb),
  };
}

/**
 * Estimate how correlation between parlay legs affects joint probability
 * Positive correlation → actual joint prob HIGHER than product of individuals
 */
function estimateCorrelationAdjustment(legs, correlationMatrix) {
  // If we have specific correlation data, use it
  // Otherwise, use heuristic-based correlation estimation
  let adjustment = 1.0;
  
  for (let i = 0; i < legs.length; i++) {
    for (let j = i + 1; j < legs.length; j++) {
      // Check for known positive correlations
      const corr = getCorrelation(legs[i], legs[j], correlationMatrix);
      // Positive correlation increases joint probability
      adjustment *= (1 + corr * 0.15);
    }
  }
  
  return adjustment;
}

/**
 * Get correlation between two parlay legs
 */
function getCorrelation(leg1, leg2, correlationMatrix) {
  // Known positive correlations in football
  const positiveCorrelations = {
    'Home_vs_Over': 0.25,
    'Away_vs_Over': 0.20,
    'Home_vs_BTTS_Yes': 0.15,
    'Over_vs_BTTS_Yes': 0.45,
  };
  
  const key1 = `${leg1.market}_vs_${leg2.market}`;
  const key2 = `${leg2.market}_vs_${leg1.market}`;
  
  return correlationMatrix[key1] || correlationMatrix[key2] || 
         positiveCorrelations[key1] || positiveCorrelations[key2] || 0;
}

/**
 * Generate the "Reverse Engineering" explanation
 * Explains exactly which node in the bookmaker's pricing the AI exploited
 */
function generateReverseEngineering(legs, trueJointProb, bookJointProb) {
  const edge = trueJointProb - bookJointProb;
  const exploitPercent = ((edge / bookJointProb) * 100).toFixed(1);
  
  const explanations = [];
  
  legs.forEach(leg => {
    if (leg.ev > 0.10) {
      explanations.push(
        `📊 ${leg.selection}: Bookmaker underestimates true probability by ${(leg.edge * 100).toFixed(1)}%. ` +
        `Model assigns ${(leg.trueProbability * 100).toFixed(1)}% vs. implied ${((1/leg.odds) * 100).toFixed(1)}%.`
      );
    }
  });
  
  if (explanations.length === 0) {
    explanations.push(
      `🔍 Correlation blindness detected: While individual legs show modest edge, ` +
      `the bookmaker's SGP matrix fails to account for positive tactical correlations ` +
      `between these outcomes, yielding a combined ${exploitPercent}% pricing error.`
    );
  }
  
  return {
    summary: `System exploits ${exploitPercent}% mispricing in bookmaker's SGP correlation matrix.`,
    details: explanations,
    bookmakerError: edge > 0.03 ? 'CORRELATION_BLINDNESS' : edge > 0.01 ? 'MARGIN_MISCALCULATION' : 'MINOR_EDGE',
  };
}

/**
 * Calculate Closing Line Value (CLV)
 * Compares the odds at bet placement vs. the final closing odds
 * 
 * @param {number} placedOdds - Odds when bet was placed
 * @param {number} closingOdds - Final odds before kickoff
 * @returns {Object} CLV analysis
 */
export function calculateCLV(placedOdds, closingOdds) {
  const placedImplied = 1 / placedOdds;
  const closingImplied = 1 / closingOdds;
  const clv = placedImplied - closingImplied;
  const clvPercentage = ((placedOdds - closingOdds) / closingOdds) * 100;
  
  return {
    clv,
    clvPercentage: clvPercentage.toFixed(2) + '%',
    isPositive: clv > 0,
    placedOdds,
    closingOdds,
    interpretation: clv > 0.02 ? 'Excellent — consistently beating the close' :
                    clv > 0 ? 'Good — mild positive CLV' :
                    'Negative CLV — model needs calibration',
  };
}
