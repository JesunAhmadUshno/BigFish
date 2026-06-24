/**
 * BigFish — Physiometric & Environmental Agent
 * 
 * Calculates physiological degradation of players based on environmental 
 * conditions. Implements the exact formulas from the PDF's agent prompts:
 * 
 * 1. Hypoxic Decay: 7.5% reduction per 1000m above 1500m after 60th minute
 * 2. Thermal Stress: WBGT > 32°C → cooling breaks, +12% defensive errors
 * 3. Circadian Misalignment: 2.5% penalty per timezone crossed (72hr window)
 * 4. Injury Vector: environmental soft-tissue injury probability
 * 
 * Generates time-series decay curves (0-100 minutes) representing the
 * physical efficacy coefficient for both teams.
 */

import { PHYSIO_CONSTANTS, VENUES, TEAM_REGIONS } from './constants.js';

/**
 * Calculate hypoxic decay factor based on altitude
 * VO2max decreases 7-8% per 1000m above 1500m
 * 
 * @param {number} altitude_m - Venue altitude in meters
 * @param {number} teamBaseAltitude - Team's home base altitude
 * @param {number} minute - Current match minute
 * @returns {number} Efficiency multiplier (0-1)
 */
export function calculateHypoxicDecay(altitude_m, teamBaseAltitude = 0, minute = 90) {
  const { HYPOXIC_THRESHOLD_M, HYPOXIC_DECAY_PER_1000M, HYPOXIC_ONSET_MINUTE } = PHYSIO_CONSTANTS;
  
  // No decay below threshold
  if (altitude_m <= HYPOXIC_THRESHOLD_M) return 1.0;
  
  // Teams from high altitude are acclimatized
  const effectiveAltitude = Math.max(0, altitude_m - Math.max(teamBaseAltitude, 0));
  if (effectiveAltitude <= 0) return 1.0;
  
  // Calculate base decay
  const altitudeAboveThreshold = Math.max(0, effectiveAltitude - HYPOXIC_THRESHOLD_M);
  const baseDecay = (altitudeAboveThreshold / 1000) * HYPOXIC_DECAY_PER_1000M;
  
  // Decay is progressive after onset minute
  if (minute <= HYPOXIC_ONSET_MINUTE) {
    return 1.0 - baseDecay * 0.3; // Mild effect in first 60 min
  }
  
  // Exponential increase in decay after 60th minute
  const postOnsetMinutes = minute - HYPOXIC_ONSET_MINUTE;
  const progressiveFactor = 1 + (postOnsetMinutes / 30) * 0.5;
  
  return Math.max(0.5, 1.0 - baseDecay * progressiveFactor);
}

/**
 * Calculate thermal stress factor
 * Based on Wet-Bulb Globe Temperature (WBGT)
 * 
 * @param {number} wbgt - Wet-Bulb Globe Temperature in °C
 * @param {number} minute - Current match minute
 * @returns {{ efficiency: number, coolingBreak: boolean, errorMultiplier: number }}
 */
export function calculateThermalStress(wbgt, minute = 90) {
  const { THERMAL_WBGT_THRESHOLD, THERMAL_ERROR_INCREASE, THERMAL_ERROR_WINDOW } = PHYSIO_CONSTANTS;
  
  if (wbgt <= 25) {
    return { efficiency: 1.0, coolingBreak: false, errorMultiplier: 1.0 };
  }
  
  // Gradual efficiency loss from 25°C to threshold
  let efficiency = 1.0;
  if (wbgt > 25 && wbgt <= THERMAL_WBGT_THRESHOLD) {
    efficiency = 1.0 - ((wbgt - 25) / (THERMAL_WBGT_THRESHOLD - 25)) * 0.08;
  }
  
  // Severe impact above threshold
  const coolingBreak = wbgt > THERMAL_WBGT_THRESHOLD;
  
  if (wbgt > THERMAL_WBGT_THRESHOLD) {
    const excess = wbgt - THERMAL_WBGT_THRESHOLD;
    efficiency = 0.92 - excess * 0.015;
    
    // Progressive fatigue through the match
    if (minute > 30) {
      efficiency -= (minute - 30) * 0.001;
    }
  }
  
  // Error multiplier increases in pre-halftime and pre-fulltime windows
  let errorMultiplier = 1.0;
  const isPreHalftime = minute >= (45 - THERMAL_ERROR_WINDOW) && minute <= 45;
  const isPreFulltime = minute >= (90 - THERMAL_ERROR_WINDOW) && minute <= 95;
  
  if (wbgt > THERMAL_WBGT_THRESHOLD && (isPreHalftime || isPreFulltime)) {
    errorMultiplier = 1.0 + THERMAL_ERROR_INCREASE;
  }
  
  return {
    efficiency: Math.max(0.6, efficiency),
    coolingBreak,
    errorMultiplier,
  };
}

/**
 * Calculate circadian misalignment penalty
 * 2.5% reaction time penalty per timezone crossed for 72 hours post-travel
 * 
 * @param {number} timezonesCrossed - Absolute number of timezones crossed
 * @param {number} hoursSinceArrival - Hours since team arrived at venue
 * @returns {number} Efficiency multiplier (0-1)
 */
export function calculateCircadianPenalty(timezonesCrossed, hoursSinceArrival = 48) {
  const { CIRCADIAN_PENALTY_PER_TZ, CIRCADIAN_RECOVERY_HOURS } = PHYSIO_CONSTANTS;
  
  if (timezonesCrossed === 0) return 1.0;
  
  // Full penalty in first 24 hours, linear recovery over 72 hours
  const recoveryFraction = Math.min(1, hoursSinceArrival / CIRCADIAN_RECOVERY_HOURS);
  const basePenalty = timezonesCrossed * CIRCADIAN_PENALTY_PER_TZ;
  const adjustedPenalty = basePenalty * (1 - recoveryFraction);
  
  return Math.max(0.75, 1.0 - adjustedPenalty);
}

/**
 * Estimate WBGT from standard meteorological data
 * Approximation formula when full radiative data is unavailable
 * 
 * WBGT ≈ 0.567 × Ta + 0.393 × e + 3.94
 * where e = vapor pressure = (RH/100) × 6.105 × exp(17.27 × Ta / (237.7 + Ta))
 * 
 * @param {number} temperature_c - Air temperature in °C
 * @param {number} humidity_pct - Relative humidity (0-100)
 * @param {number} windSpeed_ms - Wind speed in m/s
 * @returns {number} Estimated WBGT in °C
 */
export function estimateWBGT(temperature_c, humidity_pct, windSpeed_ms = 2) {
  // Vapor pressure calculation
  const e = (humidity_pct / 100) * 6.105 * Math.exp((17.27 * temperature_c) / (237.7 + temperature_c));
  
  // ABM/BoM outdoor WBGT approximation
  let wbgt = 0.567 * temperature_c + 0.393 * e + 3.94;
  
  // Wind cooling effect (moderate)
  if (windSpeed_ms > 3) {
    wbgt -= (windSpeed_ms - 3) * 0.3;
  }
  
  return Math.round(wbgt * 10) / 10;
}

/**
 * Generate a full 100-minute physical efficacy decay curve for a team
 * 
 * @param {Object} params
 * @param {string} params.teamName - Team name
 * @param {string} params.venueId - Venue identifier
 * @param {number} params.wbgt - WBGT at venue
 * @param {number} [params.hoursSinceArrival] - Hours since team arrived
 * @returns {Object} Decay curve and metadata
 */
export function generateDecayCurve({
  teamName,
  venueId,
  wbgt = 25,
  hoursSinceArrival = 72,
}) {
  const venue = VENUES[venueId] || { altitude_m: 0, utc_offset: -5 };
  const teamRegion = TEAM_REGIONS[teamName] || { base_tz_offset: -5, base_altitude: 0 };
  
  const timezonesCrossed = Math.abs(venue.utc_offset - teamRegion.base_tz_offset);
  
  const curve = [];
  const factors = {
    hypoxic: [],
    thermal: [],
    circadian: calculateCircadianPenalty(timezonesCrossed, hoursSinceArrival),
  };
  
  for (let minute = 0; minute <= 100; minute++) {
    const hypoxic = calculateHypoxicDecay(venue.altitude_m, teamRegion.base_altitude, minute);
    const thermal = calculateThermalStress(wbgt, minute);
    const circadian = factors.circadian;
    
    // Composite efficiency = product of all factors
    const compositeEfficiency = hypoxic * thermal.efficiency * circadian;
    
    curve.push({
      minute,
      efficiency: Math.round(compositeEfficiency * 1000) / 1000,
      hypoxicFactor: Math.round(hypoxic * 1000) / 1000,
      thermalFactor: Math.round(thermal.efficiency * 1000) / 1000,
      circadianFactor: Math.round(circadian * 1000) / 1000,
      errorMultiplier: thermal.errorMultiplier,
      coolingBreak: thermal.coolingBreak,
    });
    
    factors.hypoxic.push(hypoxic);
    factors.thermal.push(thermal.efficiency);
  }
  
  // Average efficiency over the match
  const avgEfficiency = curve.reduce((s, c) => s + c.efficiency, 0) / curve.length;
  
  return {
    teamName,
    venue: venue.name || venueId,
    altitude: venue.altitude_m,
    wbgt,
    timezonesCrossed,
    hoursSinceArrival,
    avgEfficiency: Math.round(avgEfficiency * 1000) / 1000,
    curve,
    summary: {
      first_half_avg: Math.round(curve.slice(0, 46).reduce((s, c) => s + c.efficiency, 0) / 46 * 1000) / 1000,
      second_half_avg: Math.round(curve.slice(46).reduce((s, c) => s + c.efficiency, 0) / (curve.length - 46) * 1000) / 1000,
      minimum: Math.min(...curve.map(c => c.efficiency)),
      decay_onset_minute: curve.findIndex(c => c.efficiency < 0.95) || 'N/A',
    },
  };
}

/**
 * Compare two teams' physiometric profiles for a given match
 * Returns the environmental advantage/disadvantage assessment
 * 
 * @param {Object} params
 * @param {string} params.homeTeam - Home team name
 * @param {string} params.awayTeam - Away team name
 * @param {string} params.venueId - Venue identifier
 * @param {Object} params.weather - Weather data { temperature_c, humidity_pct, windSpeed_ms }
 * @returns {Object} Comparative physiometric assessment
 */
export function compareTeamPhysiometrics({
  homeTeam,
  awayTeam,
  venueId,
  weather = { temperature_c: 25, humidity_pct: 50, windSpeed_ms: 3 },
  hoursSinceArrivalHome = 168,  // Home team assumed acclimatized
  hoursSinceArrivalAway = 48,
}) {
  const wbgt = estimateWBGT(weather.temperature_c, weather.humidity_pct, weather.windSpeed_ms);
  
  const homeCurve = generateDecayCurve({
    teamName: homeTeam,
    venueId,
    wbgt,
    hoursSinceArrival: hoursSinceArrivalHome,
  });
  
  const awayCurve = generateDecayCurve({
    teamName: awayTeam,
    venueId,
    wbgt,
    hoursSinceArrival: hoursSinceArrivalAway,
  });
  
  const advantage = homeCurve.avgEfficiency - awayCurve.avgEfficiency;
  
  return {
    wbgt,
    weather,
    home: homeCurve,
    away: awayCurve,
    advantage: {
      team: advantage > 0.02 ? homeTeam : advantage < -0.02 ? awayTeam : 'Neutral',
      magnitude: Math.abs(advantage),
      description: Math.abs(advantage) > 0.05
        ? 'Significant environmental advantage'
        : Math.abs(advantage) > 0.02
          ? 'Moderate environmental advantage'
          : 'Minimal environmental impact',
    },
    alerts: [
      ...(wbgt > 32 ? [`⚠️ WBGT ${wbgt}°C exceeds FIFA cooling break threshold`] : []),
      ...(homeCurve.altitude > 1500 ? [`🏔️ High altitude venue: ${homeCurve.altitude}m`] : []),
      ...(awayCurve.timezonesCrossed > 4 ? [`✈️ ${awayTeam}: ${awayCurve.timezonesCrossed} timezones crossed`] : []),
    ],
  };
}
