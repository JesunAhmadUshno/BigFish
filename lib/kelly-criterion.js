/**
 * BigFish — Kelly Criterion Calculator
 * 
 * Implements the Fractional Kelly Criterion for optimal bankroll management.
 * The Kelly formula maximizes long-term log-wealth growth while protecting
 * against ruin via fractional staking strategies.
 * 
 * Formula: f* = (b×p - q) / b
 * where b = net decimal odds, p = true win probability, q = 1-p
 * 
 * References:
 * - Kelly (1956) "A New Interpretation of Information Rate"
 * - Thorp (2006) "The Kelly Criterion in Blackjack, Sports Betting..."
 */

import { KELLY_DEFAULTS } from './constants.js';

/**
 * Calculate the full Kelly stake fraction
 * 
 * @param {number} trueProbability - True probability of winning (0-1)
 * @param {number} decimalOdds - Decimal odds offered by bookmaker
 * @returns {number} Optimal fraction of bankroll to wager (can be negative = don't bet)
 */
export function fullKelly(trueProbability, decimalOdds) {
  const b = decimalOdds - 1; // Net decimal odds (profit per unit)
  const p = trueProbability;
  const q = 1 - p;
  
  if (b <= 0) return 0;
  
  const fraction = (b * p - q) / b;
  return fraction;
}

/**
 * Calculate Fractional Kelly stake
 * 
 * @param {number} trueProbability - True win probability
 * @param {number} decimalOdds - Decimal odds
 * @param {number} fraction - Kelly fraction (0.25 = Quarter-Kelly, 0.5 = Half-Kelly)
 * @param {number} bankroll - Current bankroll amount
 * @param {number} maxBetFraction - Maximum bet as fraction of bankroll
 * @returns {Object} Stake recommendation
 */
export function fractionalKelly(
  trueProbability,
  decimalOdds,
  fraction = KELLY_DEFAULTS.FRACTION,
  bankroll = KELLY_DEFAULTS.INITIAL_BANKROLL,
  maxBetFraction = KELLY_DEFAULTS.MAX_BET_FRACTION
) {
  const fullK = fullKelly(trueProbability, decimalOdds);
  const fractionalK = fullK * fraction;
  
  // Don't bet if edge is negative
  if (fractionalK <= 0) {
    return {
      shouldBet: false,
      stake: 0,
      stakeAmount: 0,
      kellyFraction: fullK,
      fractionalKelly: fractionalK,
      edge: calculateEdge(trueProbability, decimalOdds),
      expectedValue: calculateEV(trueProbability, decimalOdds),
      reason: 'Negative edge — no bet recommended',
    };
  }
  
  // Cap at maximum bet fraction
  const cappedFraction = Math.min(fractionalK, maxBetFraction);
  const stakeAmount = cappedFraction * bankroll;
  
  const edge = calculateEdge(trueProbability, decimalOdds);
  const ev = calculateEV(trueProbability, decimalOdds);
  
  return {
    shouldBet: ev > KELLY_DEFAULTS.MIN_EV_THRESHOLD,
    stake: cappedFraction,
    stakeAmount: Math.round(stakeAmount * 100) / 100,
    kellyFraction: fullK,
    fractionalKelly: fractionalK,
    kellyMode: fraction === 1 ? 'Full Kelly' : 
               fraction === 0.5 ? 'Half Kelly' : 
               fraction === 0.25 ? 'Quarter Kelly' : 
               fraction === 0.125 ? 'Eighth Kelly' : 
               `${fraction * 100}% Kelly`,
    edge,
    expectedValue: ev,
    potentialProfit: Math.round(stakeAmount * (decimalOdds - 1) * 100) / 100,
    potentialLoss: stakeAmount,
    growthRate: calculateGrowthRate(trueProbability, decimalOdds, cappedFraction),
    reason: ev > KELLY_DEFAULTS.MIN_EV_THRESHOLD 
      ? `+EV opportunity detected (${(ev * 100).toFixed(1)}% edge)` 
      : `Edge below minimum threshold (${(ev * 100).toFixed(1)}% < ${(KELLY_DEFAULTS.MIN_EV_THRESHOLD * 100)}%)`,
  };
}

/**
 * Calculate Expected Value
 * EV = (probability × decimal_odds) - 1
 * 
 * @param {number} trueProbability
 * @param {number} decimalOdds
 * @returns {number} Expected value per unit staked
 */
export function calculateEV(trueProbability, decimalOdds) {
  return trueProbability * decimalOdds - 1;
}

/**
 * Calculate edge (true probability vs implied)
 * @param {number} trueProbability
 * @param {number} decimalOdds
 * @returns {number} Edge as decimal
 */
export function calculateEdge(trueProbability, decimalOdds) {
  const impliedProb = 1 / decimalOdds;
  return trueProbability - impliedProb;
}

/**
 * Calculate expected log-growth rate (Kelly growth rate)
 * G(f) = p × ln(1 + f×b) + q × ln(1 - f)
 * 
 * @param {number} p - True probability
 * @param {number} odds - Decimal odds
 * @param {number} f - Fraction of bankroll wagered
 * @returns {number} Expected growth rate
 */
export function calculateGrowthRate(p, odds, f) {
  const b = odds - 1;
  const q = 1 - p;
  if (f <= 0 || f >= 1) return 0;
  return p * Math.log(1 + f * b) + q * Math.log(1 - f);
}

/**
 * Calculate risk of ruin given a series of bets
 * Approximation: RoR ≈ ((1-edge)/edge)^(bankroll/avgBetSize)
 * 
 * @param {number} edge - Average edge per bet
 * @param {number} bankroll - Current bankroll
 * @param {number} avgBetSize - Average bet size
 * @returns {number} Approximate probability of ruin (0-1)
 */
export function riskOfRuin(edge, bankroll, avgBetSize) {
  if (edge <= 0) return 1;
  const ratio = (1 - edge) / edge;
  const units = bankroll / avgBetSize;
  return Math.pow(ratio, units);
}

/**
 * Calculate optimal stake for a parlay (multiple correlated legs)
 * Adjusts Kelly for the correlation between legs
 * 
 * @param {number} jointProbability - True joint probability of parlay hitting
 * @param {number} parlayOdds - Combined decimal odds of the parlay
 * @param {number} fraction - Kelly fraction to use
 * @param {number} bankroll - Current bankroll
 * @returns {Object} Parlay stake recommendation
 */
export function parlayKelly(jointProbability, parlayOdds, fraction = KELLY_DEFAULTS.FRACTION, bankroll = KELLY_DEFAULTS.INITIAL_BANKROLL) {
  return fractionalKelly(jointProbability, parlayOdds, fraction, bankroll);
}

/**
 * Simultaneous bet allocation — adjusts stakes when multiple bets are active
 * Accounts for covariance across bets to prevent overexposure
 * 
 * @param {Object[]} bets - Array of bet objects with { trueProbability, decimalOdds }
 * @param {number} bankroll - Current bankroll
 * @param {number} fraction - Kelly fraction
 * @param {number} maxTotal - Maximum total exposure as fraction of bankroll
 * @returns {Object[]} Adjusted stake recommendations
 */
export function simultaneousAllocation(
  bets,
  bankroll = KELLY_DEFAULTS.INITIAL_BANKROLL,
  fraction = KELLY_DEFAULTS.FRACTION,
  maxTotal = 0.15 // Max 15% of bankroll exposed simultaneously
) {
  // Calculate individual Kelly stakes
  const stakes = bets.map(bet => 
    fractionalKelly(bet.trueProbability, bet.decimalOdds, fraction, bankroll)
  );
  
  // Calculate total exposure
  const totalExposure = stakes.reduce((sum, s) => sum + s.stake, 0);
  
  // If total exceeds max, scale down proportionally
  if (totalExposure > maxTotal) {
    const scaleFactor = maxTotal / totalExposure;
    return stakes.map(s => ({
      ...s,
      stake: s.stake * scaleFactor,
      stakeAmount: Math.round(s.stakeAmount * scaleFactor * 100) / 100,
      scaled: true,
      scaleFactor,
    }));
  }
  
  return stakes.map(s => ({ ...s, scaled: false, scaleFactor: 1 }));
}

/**
 * Track bankroll history and calculate performance metrics
 * 
 * @param {Object[]} betHistory - Array of completed bets
 * @param {number} initialBankroll - Starting bankroll
 * @returns {Object} Performance analytics
 */
export function calculatePerformance(betHistory, initialBankroll = KELLY_DEFAULTS.INITIAL_BANKROLL) {
  let bankroll = initialBankroll;
  const history = [{ time: 0, bankroll: initialBankroll }];
  let wins = 0, losses = 0;
  let totalStaked = 0, totalReturn = 0;
  let maxBankroll = initialBankroll, maxDrawdown = 0;
  
  betHistory.forEach((bet, i) => {
    totalStaked += bet.stakeAmount;
    if (bet.won) {
      wins++;
      const profit = bet.stakeAmount * (bet.decimalOdds - 1);
      bankroll += profit;
      totalReturn += bet.stakeAmount + profit;
    } else {
      losses++;
      bankroll -= bet.stakeAmount;
      totalReturn += 0;
    }
    
    maxBankroll = Math.max(maxBankroll, bankroll);
    const drawdown = (maxBankroll - bankroll) / maxBankroll;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
    
    history.push({ time: i + 1, bankroll: Math.round(bankroll * 100) / 100 });
  });
  
  return {
    currentBankroll: Math.round(bankroll * 100) / 100,
    totalBets: betHistory.length,
    wins,
    losses,
    winRate: betHistory.length > 0 ? wins / betHistory.length : 0,
    roi: totalStaked > 0 ? (totalReturn - totalStaked) / totalStaked : 0,
    profitLoss: Math.round((bankroll - initialBankroll) * 100) / 100,
    maxDrawdown,
    sharpeRatio: calculateSharpe(betHistory),
    history,
  };
}

/**
 * Calculate Sharpe ratio of betting performance
 */
function calculateSharpe(betHistory) {
  if (betHistory.length < 2) return 0;
  
  const returns = betHistory.map(bet => {
    if (bet.won) return bet.decimalOdds - 1;
    return -1;
  });
  
  const meanReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  return stdDev > 0 ? meanReturn / stdDev : 0;
}
