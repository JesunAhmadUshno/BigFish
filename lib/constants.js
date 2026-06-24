/**
 * BigFish Constants — 2026 FIFA World Cup Venue & Team Database
 * Contains all environmental, geographical, and team data needed
 * for the physiometric agent and prediction models.
 */

// ─── 2026 FIFA World Cup Venues ──────────────────────────────────
export const VENUES = {
  // MEXICO
  'estadio-azteca': {
    name: 'Estadio Azteca',
    city: 'Mexico City',
    country: 'Mexico',
    lat: 19.3029,
    lon: -99.1505,
    altitude_m: 2240,
    capacity: 87523,
    climate_zone: 'Cwb', // Subtropical highland
    avg_summer_temp_c: 22,
    avg_summer_humidity: 55,
    timezone: 'America/Mexico_City',
    utc_offset: -6,
  },
  'estadio-akron': {
    name: 'Estadio Akron',
    city: 'Guadalajara',
    country: 'Mexico',
    lat: 20.6810,
    lon: -103.4625,
    altitude_m: 1566,
    capacity: 49850,
    climate_zone: 'Aw', // Tropical savanna
    avg_summer_temp_c: 25,
    avg_summer_humidity: 65,
    timezone: 'America/Mexico_City',
    utc_offset: -6,
  },
  'estadio-bbva': {
    name: 'Estadio BBVA',
    city: 'Monterrey',
    country: 'Mexico',
    lat: 25.6687,
    lon: -100.2454,
    altitude_m: 540,
    capacity: 53500,
    climate_zone: 'BSh', // Hot semi-arid
    avg_summer_temp_c: 34,
    avg_summer_humidity: 60,
    timezone: 'America/Monterrey',
    utc_offset: -6,
  },
  // UNITED STATES
  'metlife-stadium': {
    name: 'MetLife Stadium',
    city: 'New York/New Jersey',
    country: 'USA',
    lat: 40.8128,
    lon: -74.0742,
    altitude_m: 5,
    capacity: 82500,
    climate_zone: 'Cfa', // Humid subtropical
    avg_summer_temp_c: 28,
    avg_summer_humidity: 65,
    timezone: 'America/New_York',
    utc_offset: -5,
  },
  'at-and-t-stadium': {
    name: 'AT&T Stadium',
    city: 'Dallas',
    country: 'USA',
    lat: 32.7473,
    lon: -97.0945,
    altitude_m: 162,
    capacity: 92967,
    climate_zone: 'Cfa',
    avg_summer_temp_c: 36,
    avg_summer_humidity: 55,
    timezone: 'America/Chicago',
    utc_offset: -6,
    retractable_roof: true,
  },
  'hard-rock-stadium': {
    name: 'Hard Rock Stadium',
    city: 'Miami',
    country: 'USA',
    lat: 25.9580,
    lon: -80.2389,
    altitude_m: 4,
    capacity: 64767,
    climate_zone: 'Am', // Tropical monsoon
    avg_summer_temp_c: 33,
    avg_summer_humidity: 75,
    timezone: 'America/New_York',
    utc_offset: -5,
  },
  'sofi-stadium': {
    name: 'SoFi Stadium',
    city: 'Los Angeles',
    country: 'USA',
    lat: 33.9535,
    lon: -118.3392,
    altitude_m: 26,
    capacity: 70240,
    climate_zone: 'Csb', // Mediterranean
    avg_summer_temp_c: 27,
    avg_summer_humidity: 60,
    timezone: 'America/Los_Angeles',
    utc_offset: -8,
  },
  'levis-stadium': {
    name: "Levi's Stadium",
    city: 'San Francisco/Bay Area',
    country: 'USA',
    lat: 37.4033,
    lon: -121.9695,
    altitude_m: 12,
    capacity: 68500,
    climate_zone: 'Csb',
    avg_summer_temp_c: 24,
    avg_summer_humidity: 55,
    timezone: 'America/Los_Angeles',
    utc_offset: -8,
  },
  'nrg-stadium': {
    name: 'NRG Stadium',
    city: 'Houston',
    country: 'USA',
    lat: 29.6847,
    lon: -95.4107,
    altitude_m: 15,
    capacity: 72220,
    climate_zone: 'Cfa',
    avg_summer_temp_c: 35,
    avg_summer_humidity: 75,
    timezone: 'America/Chicago',
    utc_offset: -6,
    retractable_roof: true,
  },
  'lincoln-financial-field': {
    name: 'Lincoln Financial Field',
    city: 'Philadelphia',
    country: 'USA',
    lat: 39.9012,
    lon: -75.1675,
    altitude_m: 12,
    capacity: 69328,
    climate_zone: 'Cfa',
    avg_summer_temp_c: 30,
    avg_summer_humidity: 65,
    timezone: 'America/New_York',
    utc_offset: -5,
  },
  'mercedes-benz-stadium': {
    name: 'Mercedes-Benz Stadium',
    city: 'Atlanta',
    country: 'USA',
    lat: 33.7554,
    lon: -84.4010,
    altitude_m: 320,
    capacity: 71000,
    climate_zone: 'Cfa',
    avg_summer_temp_c: 32,
    avg_summer_humidity: 70,
    timezone: 'America/New_York',
    utc_offset: -5,
    retractable_roof: true,
  },
  'centurylink-field': {
    name: 'Lumen Field',
    city: 'Seattle',
    country: 'USA',
    lat: 47.5952,
    lon: -122.3316,
    altitude_m: 5,
    capacity: 68740,
    climate_zone: 'Csb',
    avg_summer_temp_c: 22,
    avg_summer_humidity: 55,
    timezone: 'America/Los_Angeles',
    utc_offset: -8,
  },
  'arrowhead-stadium': {
    name: 'GEHA Field at Arrowhead Stadium',
    city: 'Kansas City',
    country: 'USA',
    lat: 39.0489,
    lon: -94.4839,
    altitude_m: 247,
    capacity: 76416,
    climate_zone: 'Cfa',
    avg_summer_temp_c: 31,
    avg_summer_humidity: 65,
    timezone: 'America/Chicago',
    utc_offset: -6,
  },
  // CANADA
  'bc-place': {
    name: 'BC Place',
    city: 'Vancouver',
    country: 'Canada',
    lat: 49.2768,
    lon: -123.1118,
    altitude_m: 3,
    capacity: 54500,
    climate_zone: 'Cfb', // Oceanic
    avg_summer_temp_c: 20,
    avg_summer_humidity: 60,
    timezone: 'America/Vancouver',
    utc_offset: -8,
    retractable_roof: true,
  },
  'bmo-field': {
    name: 'BMO Field',
    city: 'Toronto',
    country: 'Canada',
    lat: 43.6332,
    lon: -79.4186,
    altitude_m: 77,
    capacity: 45736,
    climate_zone: 'Dfb', // Humid continental
    avg_summer_temp_c: 25,
    avg_summer_humidity: 65,
    timezone: 'America/Toronto',
    utc_offset: -5,
  },
};

// ─── Team Elo Ratings (Initial, pre-tournament) ──────────────────
export const TEAM_ELO = {
  'Argentina': 2143, 'France': 2048, 'Brazil': 2023, 'England': 2012,
  'Belgium': 1994, 'Netherlands': 1993, 'Portugal': 1987, 'Spain': 1971,
  'Italy': 1954, 'Croatia': 1952, 'Germany': 1948, 'Colombia': 1936,
  'Uruguay': 1928, 'Mexico': 1921, 'USA': 1907, 'Switzerland': 1901,
  'Denmark': 1889, 'Japan': 1872, 'Senegal': 1865, 'Iran': 1843,
  'Serbia': 1838, 'Morocco': 1832, 'Australia': 1828, 'South Korea': 1818,
  'Canada': 1805, 'Ecuador': 1796, 'Cameroon': 1794, 'Qatar': 1775,
  'Tunisia': 1768, 'Saudi Arabia': 1762, 'Ghana': 1758, 'Costa Rica': 1743,
  'Peru': 1738, 'Wales': 1731, 'Poland': 1727, 'Scotland': 1719,
  'Austria': 1714, 'Czech Republic': 1708, 'Turkey': 1703, 'Nigeria': 1698,
  'Egypt': 1693, 'Algeria': 1688, 'Paraguay': 1682, 'Chile': 1676,
  'Sweden': 1671, 'DR Congo': 1555, 'Iraq': 1520, 'New Zealand': 1480,
};

// ─── Team Home Continent (for travel distance calculations) ──────
export const TEAM_REGIONS = {
  'Argentina': { continent: 'South America', base_tz_offset: -3, base_altitude: 25 },
  'France': { continent: 'Europe', base_tz_offset: 1, base_altitude: 35 },
  'Brazil': { continent: 'South America', base_tz_offset: -3, base_altitude: 8 },
  'England': { continent: 'Europe', base_tz_offset: 0, base_altitude: 11 },
  'Germany': { continent: 'Europe', base_tz_offset: 1, base_altitude: 34 },
  'Spain': { continent: 'Europe', base_tz_offset: 1, base_altitude: 650 },
  'Colombia': { continent: 'South America', base_tz_offset: -5, base_altitude: 2640 },
  'Mexico': { continent: 'North America', base_tz_offset: -6, base_altitude: 2240 },
  'USA': { continent: 'North America', base_tz_offset: -5, base_altitude: 50 },
  'Canada': { continent: 'North America', base_tz_offset: -5, base_altitude: 77 },
  'Japan': { continent: 'Asia', base_tz_offset: 9, base_altitude: 40 },
  'South Korea': { continent: 'Asia', base_tz_offset: 9, base_altitude: 38 },
  'Australia': { continent: 'Oceania', base_tz_offset: 10, base_altitude: 58 },
  'Iran': { continent: 'Asia', base_tz_offset: 3.5, base_altitude: 1190 },
  'Saudi Arabia': { continent: 'Asia', base_tz_offset: 3, base_altitude: 612 },
  'Morocco': { continent: 'Africa', base_tz_offset: 1, base_altitude: 450 },
  'Senegal': { continent: 'Africa', base_tz_offset: 0, base_altitude: 22 },
  'DR Congo': { continent: 'Africa', base_tz_offset: 1, base_altitude: 312 },
  'Scotland': { continent: 'Europe', base_tz_offset: 0, base_altitude: 47 },
  'Austria': { continent: 'Europe', base_tz_offset: 1, base_altitude: 171 },
  'Switzerland': { continent: 'Europe', base_tz_offset: 1, base_altitude: 540 },
  'Iraq': { continent: 'Asia', base_tz_offset: 3, base_altitude: 34 },
};

// ─── Dixon-Coles Model Defaults ──────────────────────────────────
export const DIXON_COLES_DEFAULTS = {
  HOME_ADVANTAGE: 0.26,       // log-scale home advantage parameter
  TIME_DECAY_RATE: 0.0065,    // exponential decay rate (ξ)
  MAX_GOALS: 10,              // maximum goals to model in probability matrix
  RHO_INITIAL: -0.13,         // initial bivariate correlation parameter
};

// ─── Kelly Criterion Defaults ────────────────────────────────────
export const KELLY_DEFAULTS = {
  INITIAL_BANKROLL: 5000,     // $5,000 default starting bankroll
  FRACTION: 0.25,             // Quarter-Kelly
  MIN_EV_THRESHOLD: 0.05,    // 5% minimum edge to place a bet
  MAX_BET_FRACTION: 0.05,    // Never bet more than 5% of bankroll
  MAX_SIMULTANEOUS: 5,       // Max simultaneous active bets
};

// ─── Physiometric Agent Constants ────────────────────────────────
export const PHYSIO_CONSTANTS = {
  HYPOXIC_THRESHOLD_M: 1500,          // Altitude above which hypoxic decay begins
  HYPOXIC_DECAY_PER_1000M: 0.075,    // 7.5% reduction per 1000m above threshold
  HYPOXIC_ONSET_MINUTE: 60,           // Decay begins after 60th minute
  THERMAL_WBGT_THRESHOLD: 32,         // °C; triggers cooling breaks
  THERMAL_ERROR_INCREASE: 0.12,       // 12% increase in defensive errors
  THERMAL_ERROR_WINDOW: 15,           // Minutes before halftime/fulltime
  CIRCADIAN_PENALTY_PER_TZ: 0.025,   // 2.5% per timezone crossed
  CIRCADIAN_RECOVERY_HOURS: 72,       // Full recovery in 72 hours
  INJURY_SUBSTITUTION_BOOST: 0.15,    // 15% increase in substitution probability
  HIGH_ALTITUDE_GOAL_BONUS: 0.5,      // 0.5 goals per game per 1000m advantage
  VO2_MAX_REDUCTION_ALTITUDE: 0.08,   // 8% VO2max reduction per 1000m above 1500m
};

// ─── Betting Market Constants ────────────────────────────────────
export const MARKET_CONSTANTS = {
  SGP_TYPICAL_HOUSE_EDGE: 0.26,   // ~26% average SGP house edge
  MIN_PARLAY_LEGS: 2,
  MAX_PARLAY_LEGS: 6,
  SHIN_CONVERGENCE_THRESHOLD: 1e-8,
  SHIN_MAX_ITERATIONS: 1000,
};

// ─── API Configuration ──────────────────────────────────────────
export const API_CONFIG = {
  ODDS_API_BASE: 'https://api.the-odds-api.com/v4',
  ODDS_API_SPORT: 'soccer_fifa_world_cup',
  FOOTBALL_DATA_BASE: 'https://api.football-data.org/v4',
  OPEN_METEO_BASE: 'https://api.open-meteo.com/v1',
  CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes
};
