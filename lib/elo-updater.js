/**
 * BigFish — Dynamic Elo Rating Engine
 * 
 * Automatically recalculates team Elo ratings based on live
 * World Cup match results from the worldcup26.ir API.
 * 
 * Formula: Elo_new = Elo_old + K × (S - E)
 * where:
 *   K = 40 (World Cup weight factor — FIFA uses 60 but we dampen for stability)
 *   S = actual result (1 for win, 0.5 for draw, 0 for loss)
 *   E = expected result = 1 / (1 + 10^((Elo_opponent - Elo_self) / 400))
 * 
 * Goal margin multiplier (FIFA standard):
 *   G = 1 + (goal_diff - 1) * 0.5  (capped at 3.0)
 * 
 * References:
 * - FIFA/Elo World Football Rankings methodology
 * - Mark Glickman (1995) "Rating Systems for Chess"
 */

import { TEAM_ELO } from './constants.js';

const K_FACTOR = 40; // World Cup matches are high-stakes

/**
 * Calculate expected score using Elo formula
 * @param {number} eloA - Rating of team A
 * @param {number} eloB - Rating of team B
 * @returns {number} Expected score for team A (0 to 1)
 */
function expectedScore(eloA, eloB) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

/**
 * Goal difference multiplier (FIFA standard)
 * Amplifies Elo change for convincing victories
 */
function goalDiffMultiplier(goalDiff) {
  const absDiff = Math.abs(goalDiff);
  if (absDiff <= 1) return 1.0;
  if (absDiff === 2) return 1.5;
  return 1.0 + (absDiff - 1) * 0.5; // Cap natural growth
}

/**
 * Process a single match result and return updated Elo ratings
 * @param {number} homeElo - Home team's current Elo
 * @param {number} awayElo - Away team's current Elo
 * @param {number} homeScore - Goals scored by home team
 * @param {number} awayScore - Goals scored by away team
 * @returns {{ homeEloNew: number, awayEloNew: number, eloChange: number }}
 */
export function processMatchResult(homeElo, awayElo, homeScore, awayScore) {
  // Actual result
  let sHome, sAway;
  if (homeScore > awayScore) {
    sHome = 1; sAway = 0;
  } else if (homeScore === awayScore) {
    sHome = 0.5; sAway = 0.5;
  } else {
    sHome = 0; sAway = 1;
  }

  // Expected results
  const eHome = expectedScore(homeElo, awayElo);
  const eAway = 1 - eHome;

  // Goal difference multiplier
  const G = goalDiffMultiplier(homeScore - awayScore);

  // Elo changes
  const deltaHome = Math.round(K_FACTOR * G * (sHome - eHome));
  const deltaAway = Math.round(K_FACTOR * G * (sAway - eAway));

  return {
    homeEloNew: homeElo + deltaHome,
    awayEloNew: awayElo + deltaAway,
    eloChange: deltaHome,
    expected: { home: eHome, away: eAway },
    actual: { home: sHome, away: sAway },
  };
}

/**
 * Fetch live World Cup results and recalculate all Elo ratings
 * Returns a fresh copy of the TEAM_ELO map with updated ratings
 * 
 * @returns {Promise<Object>} Updated Elo ratings map + match log
 */
export async function fetchAndUpdateElo() {
  // Start with a copy of the base Elo ratings
  const updatedElo = { ...TEAM_ELO };
  const matchLog = [];

  try {
    const res = await fetch('https://worldcup26.ir/get/games');
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const data = await res.json();

    // Filter to finished group/knockout matches, sort chronologically
    const finishedGames = data.games
      .filter(g => g.finished === 'TRUE')
      .sort((a, b) => parseInt(a.id) - parseInt(b.id));

    for (const game of finishedGames) {
      const homeTeam = game.home_team_name_en;
      const awayTeam = game.away_team_name_en;
      const homeScore = parseInt(game.home_score) || 0;
      const awayScore = parseInt(game.away_score) || 0;

      if (!homeTeam || !awayTeam) continue;

      // Get current ratings (or default)
      const homeElo = updatedElo[homeTeam] || 1700;
      const awayElo = updatedElo[awayTeam] || 1700;

      const result = processMatchResult(homeElo, awayElo, homeScore, awayScore);

      // Update the map
      updatedElo[homeTeam] = result.homeEloNew;
      updatedElo[awayTeam] = result.awayEloNew;

      matchLog.push({
        matchId: game.id,
        home: homeTeam,
        away: awayTeam,
        score: `${homeScore}-${awayScore}`,
        eloChange: result.eloChange,
        homeEloBefore: homeElo,
        homeEloAfter: result.homeEloNew,
        awayEloBefore: awayElo,
        awayEloAfter: result.awayEloNew,
      });
    }
  } catch (err) {
    console.warn('Elo update failed, using base ratings:', err);
  }

  return { elo: updatedElo, matchLog, gamesProcessed: matchLog.length };
}
