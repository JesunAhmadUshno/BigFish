/**
 * Player Data & xG Allocation Engine
 * Simulates fetching Starting XI lineups and assigns fractional xG weights
 * to players based on their position and historical scoring rates.
 */

// Simulated Starting XIs for the 2026 World Cup matches
const MOCK_SQUADS = {
  'Switzerland': [
    { name: 'Breel Embolo', pos: 'FW', xgWeight: 0.35 },
    { name: 'Xherdan Shaqiri', pos: 'AM', xgWeight: 0.20 },
    { name: 'Ruben Vargas', pos: 'LW', xgWeight: 0.15 },
    { name: 'Granit Xhaka', pos: 'CM', xgWeight: 0.08 },
    { name: 'Remo Freuler', pos: 'CM', xgWeight: 0.07 },
    { name: 'Manuel Akanji', pos: 'CB', xgWeight: 0.05 },
    { name: 'Other (Defense/Mid)', pos: 'ALL', xgWeight: 0.10 },
  ],
  'Canada': [
    { name: 'Jonathan David', pos: 'FW', xgWeight: 0.40 },
    { name: 'Alphonso Davies', pos: 'LW', xgWeight: 0.25 },
    { name: 'Cyle Larin', pos: 'FW', xgWeight: 0.20 },
    { name: 'Stephen Eustaquio', pos: 'CM', xgWeight: 0.05 },
    { name: 'Other (Defense/Mid)', pos: 'ALL', xgWeight: 0.10 },
  ],
  'Bosnia': [
    { name: 'Edin Dzeko', pos: 'FW', xgWeight: 0.45 }, // Target man gets huge share
    { name: 'Ermedin Demirovic', pos: 'FW', xgWeight: 0.25 },
    { name: 'Miralem Pjanic', pos: 'CM', xgWeight: 0.15 }, // Free kicks/Pens
    { name: 'Other (Defense/Mid)', pos: 'ALL', xgWeight: 0.15 },
  ],
  'Qatar': [
    { name: 'Almoez Ali', pos: 'FW', xgWeight: 0.38 },
    { name: 'Akram Afif', pos: 'LW', xgWeight: 0.32 },
    { name: 'Hassan Al-Haydos', pos: 'AM', xgWeight: 0.15 },
    { name: 'Other (Defense/Mid)', pos: 'ALL', xgWeight: 0.15 },
  ],
  'Scotland': [
    { name: 'Scott McTominay', pos: 'CM', xgWeight: 0.30 }, // Often scores for Scotland
    { name: 'Che Adams', pos: 'FW', xgWeight: 0.25 },
    { name: 'John McGinn', pos: 'AM', xgWeight: 0.20 },
    { name: 'Andy Robertson', pos: 'LB', xgWeight: 0.05 },
    { name: 'Other (Defense/Mid)', pos: 'ALL', xgWeight: 0.20 },
  ],
  'Brazil': [
    { name: 'Vinicius Jr', pos: 'LW', xgWeight: 0.30 },
    { name: 'Rodrygo', pos: 'RW', xgWeight: 0.25 },
    { name: 'Lucas Paqueta', pos: 'AM', xgWeight: 0.15 },
    { name: 'Bruno Guimaraes', pos: 'CM', xgWeight: 0.10 },
    { name: 'Gabriel Magalhaes', pos: 'CB', xgWeight: 0.08 }, // Set pieces
    { name: 'Other (Defense/Mid)', pos: 'ALL', xgWeight: 0.12 },
  ],
  'Morocco': [
    { name: 'Youssef En-Nesyri', pos: 'FW', xgWeight: 0.35 },
    { name: 'Hakim Ziyech', pos: 'RW', xgWeight: 0.25 },
    { name: 'Brahim Diaz', pos: 'AM', xgWeight: 0.20 },
    { name: 'Achraf Hakimi', pos: 'RB', xgWeight: 0.10 },
    { name: 'Other (Defense/Mid)', pos: 'ALL', xgWeight: 0.10 },
  ],
  'Haiti': [
    { name: 'Frantzdy Pierrot', pos: 'FW', xgWeight: 0.40 },
    { name: 'Duckens Nazon', pos: 'FW', xgWeight: 0.35 },
    { name: 'Other (Defense/Mid)', pos: 'ALL', xgWeight: 0.25 },
  ],
  'Czechia': [
    { name: 'Patrik Schick', pos: 'FW', xgWeight: 0.45 },
    { name: 'Tomas Soucek', pos: 'CM', xgWeight: 0.20 }, // Set pieces
    { name: 'Adam Hlozek', pos: 'LW', xgWeight: 0.15 },
    { name: 'Other (Defense/Mid)', pos: 'ALL', xgWeight: 0.20 },
  ],
  'Mexico': [
    { name: 'Santiago Gimenez', pos: 'FW', xgWeight: 0.35 },
    { name: 'Hirving Lozano', pos: 'LW', xgWeight: 0.25 },
    { name: 'Edson Alvarez', pos: 'CM', xgWeight: 0.10 },
    { name: 'Other (Defense/Mid)', pos: 'ALL', xgWeight: 0.30 },
  ],
  'South Africa': [
    { name: 'Percy Tau', pos: 'FW', xgWeight: 0.40 },
    { name: 'Themba Zwane', pos: 'AM', xgWeight: 0.25 },
    { name: 'Other (Defense/Mid)', pos: 'ALL', xgWeight: 0.35 },
  ],
  'South Korea': [
    { name: 'Son Heung-min', pos: 'LW', xgWeight: 0.45 },
    { name: 'Hwang Hee-chan', pos: 'RW', xgWeight: 0.25 },
    { name: 'Lee Kang-in', pos: 'AM', xgWeight: 0.15 },
    { name: 'Kim Min-jae', pos: 'CB', xgWeight: 0.05 },
    { name: 'Other (Defense/Mid)', pos: 'ALL', xgWeight: 0.10 },
  ]
};

/**
 * Gets the starting lineup and xG allocations for a team.
 */
export function getTeamLineup(teamName) {
  return MOCK_SQUADS[teamName] || [
    { name: 'Striker', pos: 'FW', xgWeight: 0.40 },
    { name: 'Winger', pos: 'LW/RW', xgWeight: 0.25 },
    { name: 'Midfielder', pos: 'CM', xgWeight: 0.15 },
    { name: 'Other', pos: 'ALL', xgWeight: 0.20 },
  ];
}

/**
 * Calculates the Anytime Goalscorer probability for a specific player.
 * Uses the team's total expected goals (lambda or mu) and the player's xG weight.
 * 
 * Prob(Player Scores >= 1) = 1 - Poisson(0, player_xG)
 */
export function calculatePlayerGoalProb(teamTotalXG, playerXGWeight) {
  const playerXG = teamTotalXG * playerXGWeight;
  // Probability of scoring exactly 0 goals
  const pZero = Math.exp(-playerXG);
  // Probability of scoring >= 1 goal
  return 1 - pZero;
}
