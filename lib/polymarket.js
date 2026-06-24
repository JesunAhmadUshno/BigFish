/**
 * Polymarket API Integration
 * Fetches market odds from Polymarket's Gamma API (https://gamma-api.polymarket.com).
 * Maps traditional World Cup team names to corresponding token conditions.
 */

// Mapping of Match teams to Polymarket market slugs (mocked for 2026 World Cup)
const POLYMARKET_SLUG_MAP = {
  'Switzerland vs Canada': 'switzerland-vs-canada-world-cup-2026',
  'Bosnia vs Qatar': 'bosnia-vs-qatar-world-cup-2026',
  'Scotland vs Brazil': 'scotland-vs-brazil-world-cup-2026',
  'Morocco vs Haiti': 'morocco-vs-haiti-world-cup-2026',
  'Czechia vs Mexico': 'czechia-vs-mexico-world-cup-2026',
  'South Africa vs South Korea': 'south-africa-vs-south-korea-world-cup-2026',
};

// Mocked live order book prices for demonstration, representing active trading
const MOCK_GAMMA_API_RESPONSES = {
  'switzerland-vs-canada-world-cup-2026': {
    homeWinProb: 0.610, // Polymarket thinks Switzerland has 61% chance (closer to true odds than bookies)
    drawProb: 0.220,
    awayWinProb: 0.170,
  },
  'bosnia-vs-qatar-world-cup-2026': {
    homeWinProb: 0.400, // Polymarket is punishing Bosnia heavily due to news, unlike bookies
    drawProb: 0.250,
    awayWinProb: 0.350,
  },
  'scotland-vs-brazil-world-cup-2026': {
    homeWinProb: 0.080,
    drawProb: 0.150,
    awayWinProb: 0.770,
  },
  'morocco-vs-haiti-world-cup-2026': {
    homeWinProb: 0.880,
    drawProb: 0.080,
    awayWinProb: 0.040,
  },
  'czechia-vs-mexico-world-cup-2026': {
    homeWinProb: 0.250,
    drawProb: 0.250,
    awayWinProb: 0.500, // Polymarket likes Mexico even more than the model
  },
  'south-africa-vs-south-korea-world-cup-2026': {
    homeWinProb: 0.150,
    drawProb: 0.250,
    awayWinProb: 0.600,
  },
};

/**
 * Fetches market data for a given matchup.
 * In a production environment, this queries the Gamma API:
 * GET https://gamma-api.polymarket.com/events?slug={slug}
 */
export async function getPolymarketOdds(homeTeam, awayTeam) {
  const matchKey = `${homeTeam} vs ${awayTeam}`;
  const slug = POLYMARKET_SLUG_MAP[matchKey];

  if (!slug) {
    return null; // Market doesn't exist on Polymarket
  }

  // Simulate network delay for API fetch
  await new Promise(resolve => setTimeout(resolve, 200));

  // Simulating the Gamma API response parse
  const data = MOCK_GAMMA_API_RESPONSES[slug];

  if (!data) return null;

  return {
    source: 'Polymarket',
    probabilities: {
      home: data.homeWinProb,
      draw: data.drawProb,
      away: data.awayWinProb,
    },
    prices: {
      // Convert decimal probabilities to "cents" as Polymarket prices them
      home: `${(data.homeWinProb * 100).toFixed(1)}¢`,
      draw: `${(data.drawProb * 100).toFixed(1)}¢`,
      away: `${(data.awayWinProb * 100).toFixed(1)}¢`,
    }
  };
}
