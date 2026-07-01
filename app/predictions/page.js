'use client';

import { useState, useEffect, useCallback } from 'react';
import EasyInterpreter from '../components/EasyInterpreter';
import RealMatchTracker from '../components/RealMatchTracker';
import Bet365Pitch from '../components/Bet365Pitch';
import { getPolymarketOdds } from '../../lib/polymarket';
import { MatchStatisticsWidget, MatchLineupWidget } from '../components/ApiWidgets';
import { getTeamLineup, calculatePlayerGoalProb } from '../../lib/player-data';
import { calculateTeamTotals, predictMatch } from '../../lib/dixon-coles';
import { getTeamSentiment } from '../../lib/sentiment-agent';
import { TEAM_ELO } from '../../lib/constants';
import { fetchAndUpdateElo } from '../../lib/elo-updater';
import { Agent } from '../../lib/execution-agent';
import NeuralHeatmap from '../components/NeuralHeatmap';
import PlayerRadar from '../components/PlayerRadar';
import { predictWithDeepLearning } from '../../lib/neural-engine';
import { Orchestrator } from '../../lib/swarm-orchestrator';

// ─── Constants ──────────────────────────────────────────
const ODDS_API_KEY = 'be0f7c5a5d221ed93cad247719623ffa';

// ─── Scoreline Probability Heatmap (Dixon-Coles Corrected) ──────
function ScorelineHeatmap({ lambda, mu, rho }) {
  const maxGoals = 6;
  const matrix = [];
  let maxP = 0;

  // Use proper Dixon-Coles τ-corrected joint probabilities
  function poissonPMF(k, lam) {
    if (lam <= 0) return k === 0 ? 1 : 0;
    let logP = -lam + k * Math.log(lam);
    for (let i = 2; i <= k; i++) logP -= Math.log(i);
    return Math.exp(logP);
  }

  function tauCorrection(x, y, lam, m, r) {
    if (x === 0 && y === 0) return 1 - lam * m * r;
    if (x === 0 && y === 1) return 1 + lam * r;
    if (x === 1 && y === 0) return 1 + m * r;
    if (x === 1 && y === 1) return 1 - r;
    return 1.0;
  }

  for (let i = 0; i <= maxGoals; i++) {
    matrix[i] = [];
    for (let j = 0; j <= maxGoals; j++) {
      const tau = tauCorrection(i, j, lambda, mu, rho);
      const p = tau * poissonPMF(i, lambda) * poissonPMF(j, mu);
      matrix[i][j] = Math.max(0, p);
      if (p > maxP) maxP = p;
    }
  }

  function getColor(p) {
    const intensity = p / (maxP || 1);
    if (intensity > 0.8) return 'rgba(0, 255, 204, 0.7)';
    if (intensity > 0.5) return 'rgba(0, 250, 154, 0.5)';
    if (intensity > 0.3) return 'rgba(255, 215, 0, 0.4)';
    if (intensity > 0.1) return 'rgba(157, 78, 221, 0.2)';
    return 'rgba(255, 255, 255, 0.02)';
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '2px', marginBottom: '2px' }}>
        <div style={{ width: '42px', minWidth: '42px' }}></div>
        {Array.from({ length: maxGoals + 1 }, (_, j) => (
          <div key={j} style={{ flex: 1, textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '4px 0' }}>{j}</div>
        ))}
      </div>
      {matrix.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: '2px', marginBottom: '2px' }}>
          <div style={{ width: '42px', minWidth: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{i}</div>
          {row.map((p, j) => (
            <div key={j} style={{
              flex: 1, background: getColor(p),
              fontSize: '0.6rem', fontFamily: 'var(--font-mono)',
              color: p / (maxP || 1) > 0.3 ? '#000' : 'var(--text-muted)',
              padding: '6px 2px', borderRadius: '2px', textAlign: 'center'
            }}>
              {(p * 100).toFixed(1)}%
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Probability Bar ────────────────────────────────────
function ProbBar({ label, modelProb, bookProb, color }) {
  const edge = modelProb - bookProb;
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <div style={{ display: 'flex', gap: '12px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
          <span style={{ color }}>Model: {(modelProb * 100).toFixed(1)}%</span>
          <span style={{ color: 'var(--text-muted)' }}>Book: {(bookProb * 100).toFixed(1)}%</span>
          <span style={{ color: edge > 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700 }}>
            {edge > 0 ? '+' : ''}{(edge * 100).toFixed(1)}% Edge
          </span>
        </div>
      </div>
      <div style={{ position: 'relative', height: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', height: '100%', width: `${modelProb * 100}%`, background: `${color}40`, borderRadius: '8px', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        <div style={{ position: 'absolute', height: '100%', width: '2px', left: `${bookProb * 100}%`, background: '#fff', opacity: 0.8, boxShadow: '0 0 4px #fff' }} />
        <div style={{ position: 'absolute', height: '100%', width: '4px', left: `${modelProb * 100}%`, background: color, borderRadius: '2px', boxShadow: `0 0 10px ${color}` }} />
      </div>
    </div>
  );
}

// ─── Main Client Page ───────────────────────────────────
export default function PredictionsPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMatch, setSelectedMatch] = useState(0);
  const [kellyMode, setKellyMode] = useState(0.25);
  const [bankroll, setBankroll] = useState(5000);
  const [sgpLegs, setSgpLegs] = useState([]);
  const [autoPilot, setAutoPilot] = useState(false);
  const [neuralData, setNeuralData] = useState(null);
  const [swarmLogs, setSwarmLogs] = useState([]);

  // Autonomous Data Fetching (Client Side for GitHub Pages)
  useEffect(() => {
    async function fetchLiveData() {
      try {
        let allMatches = [];

        // 0. Fetch dynamic Elo ratings (auto-updates based on WC results)
        let liveElo = { ...TEAM_ELO };
        try {
          const eloResult = await fetchAndUpdateElo();
          liveElo = eloResult.elo;
          console.log(`[BigFish] Dynamic Elo: ${eloResult.gamesProcessed} matches processed`);
        } catch(e) { console.warn("Elo update failed, using base ratings"); }

        // 1. Fetch FIFA World Cup 2026 matches from public free API
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const requestedMatchId = urlParams.get('matchId');

          const wcRes = await fetch('https://worldcup26.ir/get/games');
          if (wcRes.ok) {
            const wcData = await wcRes.json();
            let wcGames = wcData.games.filter(g => g.type === 'group' && g.finished === 'FALSE').slice(0, 3);
            
            if (requestedMatchId) {
              const exactMatch = wcData.games.find(g => g.id === requestedMatchId);
              if (exactMatch) {
                // Ensure exact match is at the very front of the array
                wcGames = [exactMatch, ...wcGames.filter(g => g.id !== requestedMatchId)].slice(0, 4);
              }
            }
            
            const processedWc = wcGames.map(game => {
              const homeTeam = game.home_team_name_en || game.home_team_label || 'Unknown';
              const awayTeam = game.away_team_name_en || game.away_team_label || 'Unknown';
              const prediction = predictMatch({
                homeElo: liveElo[homeTeam] || 1750,
                awayElo: liveElo[awayTeam] || 1750,
              });
              const vig = 0.05;
              return {
                id: `wc_${game.id}`,
                tournament: 'FIFA World Cup 2026',
                home: homeTeam, away: awayTeam,
                lambda: prediction.parameters.lambda, mu: prediction.parameters.mu, rho: prediction.parameters.rho,
                odds: { home: 1/(prediction.probabilities1X2.home + vig), draw: 1/(prediction.probabilities1X2.draw + vig), away: 1/(prediction.probabilities1X2.away + vig) },
                model1X2: prediction.probabilities1X2,
                book1X2: { home: prediction.probabilities1X2.home + vig, draw: prediction.probabilities1X2.draw + vig, away: prediction.probabilities1X2.away + vig },
                overUnder: prediction.overUnder, btts: prediction.btts
              };
            });
            allMatches = [...allMatches, ...processedWc];
          }
        } catch(e) {
          console.warn("WC API failed, using fallback mock data", e);
          const mockWcGames = [
            { id: '1', home_team_name_en: 'Mexico', away_team_name_en: 'Poland' },
            { id: '2', home_team_name_en: 'Canada', away_team_name_en: 'Morocco' },
            { id: '3', home_team_name_en: 'USA', away_team_name_en: 'Wales' }
          ];
          const processedWc = mockWcGames.map(game => {
            const homeTeam = game.home_team_name_en;
            const awayTeam = game.away_team_name_en;
            const prediction = predictMatch({
              homeElo: liveElo[homeTeam] || 1750,
              awayElo: liveElo[awayTeam] || 1750,
            });
            const vig = 0.05;
            return {
              id: `wc_${game.id}`,
              tournament: 'FIFA World Cup 2026',
              home: homeTeam, away: awayTeam,
              lambda: prediction.parameters.lambda, mu: prediction.parameters.mu, rho: prediction.parameters.rho,
              odds: { home: 1/(prediction.probabilities1X2.home + vig), draw: 1/(prediction.probabilities1X2.draw + vig), away: 1/(prediction.probabilities1X2.away + vig) },
              model1X2: prediction.probabilities1X2,
              book1X2: { home: prediction.probabilities1X2.home + vig, draw: prediction.probabilities1X2.draw + vig, away: prediction.probabilities1X2.away + vig },
              overUnder: prediction.overUnder, btts: prediction.btts
            };
          });
          allMatches = [...allMatches, ...processedWc];
        }

        // 2. Fetch Live Global Markets from The Odds API (using User's Key)
        try {
          // 'upcoming' gets the next 8 matches across global leagues
          const oddsRes = await fetch(`https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${ODDS_API_KEY}&regions=eu&markets=h2h&oddsFormat=decimal`);
          if (oddsRes.ok) {
            const oddsData = await oddsRes.json();
            const liveGames = oddsData.filter(g => g.sport_key.includes('soccer')).slice(0, 5);
            
            const processedOdds = liveGames.map(game => {
              const homeTeam = game.home_team;
              const awayTeam = game.away_team;
              const bookmaker = game.bookmakers[0]?.markets[0]?.outcomes || [];
              const homeOdds = bookmaker.find(o => o.name === homeTeam)?.price || 2.0;
              const awayOdds = bookmaker.find(o => o.name === awayTeam)?.price || 2.0;
              const drawOdds = bookmaker.find(o => o.name === 'Draw')?.price || 3.0;

              const prediction = predictMatch({
                homeElo: TEAM_ELO[homeTeam] || 1700,
                awayElo: TEAM_ELO[awayTeam] || 1700,
              });

              return {
                id: `odds_${game.id}`,
                tournament: 'Live Global Markets (The Odds API)',
                home: homeTeam, away: awayTeam,
                lambda: prediction.parameters.lambda, mu: prediction.parameters.mu, rho: prediction.parameters.rho,
                odds: { home: homeOdds, draw: drawOdds, away: awayOdds },
                model1X2: prediction.probabilities1X2,
                book1X2: { home: 1/homeOdds, draw: 1/drawOdds, away: 1/awayOdds },
                overUnder: prediction.overUnder, btts: prediction.btts
              };
            });
            allMatches = [...allMatches, ...processedOdds];
          }
        } catch(e) { console.warn("Odds API failed", e); }

        // 3. Fetch REAL Live Matches from API-Sports for the Live Tracker Widget
        try {
          const apiSportsRes = await fetch('https://v3.football.api-sports.io/fixtures?live=all', {
            headers: { 'x-apisports-key': '271556db4a4d80ed481770f150fe82a9' }
          });
          if (apiSportsRes.ok) {
            const apiSportsData = await apiSportsRes.json();
            const realLiveGames = apiSportsData.response.slice(0, 5).map(game => {
              const homeTeam = game.teams.home.name;
              const awayTeam = game.teams.away.name;
              
              const prediction = predictMatch({
                homeElo: TEAM_ELO[homeTeam] || 1600,
                awayElo: TEAM_ELO[awayTeam] || 1600,
              });

              return {
                id: `real_${game.fixture.id}`,
                fixtureId: game.fixture.id, // Store real fixture ID for the widget
                tournament: `${game.league.name} (LIVE)`,
                home: homeTeam, away: awayTeam,
                lambda: prediction.parameters.lambda, mu: prediction.parameters.mu, rho: prediction.parameters.rho,
                odds: { home: 1/(prediction.probabilities1X2.home + 0.05), draw: 1/(prediction.probabilities1X2.draw + 0.05), away: 1/(prediction.probabilities1X2.away + 0.05) },
                model1X2: prediction.probabilities1X2,
                book1X2: { home: prediction.probabilities1X2.home + 0.05, draw: prediction.probabilities1X2.draw + 0.05, away: prediction.probabilities1X2.away + 0.05 },
                overUnder: prediction.overUnder, btts: prediction.btts
              };
            });
            // Prepend real matches so they show up first
            allMatches = [...realLiveGames, ...allMatches];
          }
        } catch(e) { console.warn("API-Sports failed", e); }

        setMatches(allMatches);
        setLoading(false);
      } catch (error) {
        console.error("Global fetch error:", error);
        setLoading(false);
      }
    }

    fetchLiveData();
  }, []);

  const match = matches[selectedMatch];
  
  // Players and Team Totals
  const homeLineup = match ? getTeamLineup(match.home) : [];
  const awayLineup = match ? getTeamLineup(match.away) : [];
  
  // Trigger Neural Engine on Match Selection (and poll live stats)
  useEffect(() => {
    let intervalId;

    async function runNeuralSwarm() {
      if (!match) return;
      if (!neuralData) setNeuralData(null); // Reset only on initial load
      
      try {
        let liveMatchData = null;

        // If it's a real live match, fetch live stats to dynamically update the AI
        if (match.id.startsWith('real_')) {
           try {
             const statsRes = await fetch(`https://v3.football.api-sports.io/fixtures/statistics?fixture=${match.fixtureId}`, {
               headers: { 'x-apisports-key': '271556db4a4d80ed481770f150fe82a9' }
             });
             if (statsRes.ok) {
               const data = await statsRes.json();
               if (data.response && data.response.length > 0) {
                 liveMatchData = { statistics: data.response };
               }
             }
           } catch (err) { console.warn("Live stats fetch failed", err); }
        }

        // 1. Swarm Orchestrator gathers tactical/sentiment features AND live stats
        const features = await Orchestrator.orchestrateFeatures(
          { home: match.home, away: match.away, homeElo: TEAM_ELO[match.home], awayElo: TEAM_ELO[match.away], baseHomeXG: match.lambda, baseAwayXG: match.mu },
          { restDays: 4 }, { restDays: 4 }, liveMatchData
        );
        
        setSwarmLogs(features.swarmLogs);

        // 2. Deep Learning Engine calculates probability
        const prediction = await predictWithDeepLearning(features);
        setNeuralData(prediction);
      } catch (e) { console.error("Neural Engine Failed", e); }
    }
    
    runNeuralSwarm();

    // Set up continuous polling for live matches (every 30 seconds)
    if (match && match.id.startsWith('real_')) {
      intervalId = setInterval(runNeuralSwarm, 30000);
    }

    return () => clearInterval(intervalId);
  }, [match]);

  const teamTotals = match ? {
    home: calculateTeamTotals(match.lambda),
    away: calculateTeamTotals(match.mu)
  } : null;

  function getAvailableLegs() {
    if (!match || !teamTotals) return [];
    
    const baseLegs = [
      { id: 'home_ml', label: `${match.home} Win`, type: 'moneyline', odds: match.odds.home, prob: match.model1X2.home },
      { id: 'draw', label: 'Draw', type: 'moneyline', odds: match.odds.draw, prob: match.model1X2.draw },
      { id: 'away_ml', label: `${match.away} Win`, type: 'moneyline', odds: match.odds.away, prob: match.model1X2.away },
      { id: 'over_2.5', label: 'Match Over 2.5', type: 'over', odds: 1.85, prob: match.overUnder['2.5'].over },
      { id: 'btts_yes', label: 'BTTS Yes', type: 'btts_yes', odds: 2.10, prob: match.btts.yes },
      { id: 'home_o15', label: `${match.home} Over 1.5`, type: 'team_total', odds: 2.20, prob: teamTotals.home.over1_5 },
      { id: 'away_o15', label: `${match.away} Over 1.5`, type: 'team_total', odds: 2.75, prob: teamTotals.away.over1_5 },
    ];

    if (homeLineup.length > 0) {
      baseLegs.push({ id: `scorer_home_${match.home}_${homeLineup[0].name}`, label: `${homeLineup[0].name} Anytime Goal`, type: 'scorer', odds: 2.50, prob: calculatePlayerGoalProb(match.lambda, homeLineup[0].xgWeight) });
    }
    if (awayLineup.length > 0) {
      baseLegs.push({ id: `scorer_away_${match.away}_${awayLineup[0].name}`, label: `${awayLineup[0].name} Anytime Goal`, type: 'scorer', odds: 3.00, prob: calculatePlayerGoalProb(match.mu, awayLineup[0].xgWeight) });
    }
    return baseLegs;
  }

  const availableLegs = getAvailableLegs();

  function toggleLeg(leg) {
    setSgpLegs(prev => {
      const exists = prev.find(l => l.id === leg.id);
      if (exists) return prev.filter(l => l.id !== leg.id);
      if (prev.length >= 6) return prev;
      return [...prev, leg];
    });
  }

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--accent-teal)', fontFamily: 'var(--font-display)', letterSpacing: '2px' }}>⚡ INITIALIZING AUTONOMOUS AGENT...</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>Fetching Real-Time Markets via The Odds API & FIFA Servers</p>
      </div>
    );
  }

  if (!match) return <div style={{textAlign: 'center', padding: '40px'}}>No live data found.</div>;

  const combinedOdds = sgpLegs.reduce((prod, l) => prod * l.odds, 1);
  const jointProb = sgpLegs.reduce((prod, l) => prod * l.prob, 1) * (1 + sgpLegs.length * 0.03);
  const parlayEV = sgpLegs.length >= 2 ? jointProb * combinedOdds - 1 : 0;
  const kellyFraction = parlayEV > 0 ? ((combinedOdds - 1) * jointProb - (1 - jointProb)) / (combinedOdds - 1) * kellyMode : 0;
  const kellyStake = Math.max(0, Math.min(kellyFraction * bankroll, bankroll * 0.05));

  return (
    <>
      {/* Global Controls & Bankroll */}
      <div className="card animate-in animate-in-delay-1" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '16px 24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>CURRENT BANKROLL</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--accent-green)', fontFamily: 'var(--font-mono)', fontSize: '1.2rem' }}>$</span>
              <input 
                type="number" 
                value={bankroll} 
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setBankroll(val);
                  Agent.setBankroll(val);
                }}
                className="input" 
                style={{ width: '120px', fontFamily: 'var(--font-mono)', fontSize: '1.2rem', padding: '4px 8px' }} 
              />
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Auto-Pilot Execution</div>
            <div style={{ fontSize: '0.65rem', color: autoPilot ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
              {autoPilot ? '⚠️ LIVE MONEY AT RISK' : 'Manual Mode'}
            </div>
          </div>
          <button 
            onClick={() => {
              const newState = !autoPilot;
              setAutoPilot(newState);
              Agent.toggleAutoPilot(newState);
            }}
            style={{
              width: '60px', height: '32px', borderRadius: '16px',
              background: autoPilot ? 'rgba(255,51,102,0.2)' : 'rgba(255,255,255,0.1)',
              border: `2px solid ${autoPilot ? 'var(--accent-red)' : 'var(--border-subtle)'}`,
              position: 'relative', cursor: 'pointer', transition: 'all 0.3s'
            }}
          >
            <div style={{
              position: 'absolute', top: '2px', left: autoPilot ? '30px' : '2px',
              width: '24px', height: '24px', borderRadius: '50%',
              background: autoPilot ? 'var(--accent-red)' : 'var(--text-muted)',
              transition: 'all 0.3s', boxShadow: autoPilot ? '0 0 10px var(--accent-red)' : 'none'
            }} />
          </button>
        </div>
      </div>

      {/* Match Selector */}
      <div className="card animate-in animate-in-delay-1" style={{ marginBottom: '32px', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '8px' }}>
          {matches.map((m, i) => (
            <button key={i} className={`btn ${i === selectedMatch ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setSelectedMatch(i); setSgpLegs([]); }}
              style={{ minWidth: '160px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px' }}>
              <span style={{ fontSize: '0.65rem', color: i === selectedMatch ? '#000' : 'var(--accent-teal)', fontWeight: 800 }}>{m.tournament}</span>
              <span style={{ fontSize: '0.9rem', marginTop: '4px' }}>{m.home}</span>
              <span style={{ fontSize: '0.9rem', color: i === selectedMatch ? 'rgba(0,0,0,0.6)' : 'var(--text-muted)' }}>vs {m.away}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: '24px' }}>
        {/* 1X2 Comparison */}
        <div className="card animate-in animate-in-delay-2">
          <div className="card-header">
            <span className="card-title">📊 Live Bookmaker Odds vs AI Engine</span>
            <span className="stat-badge badge-orange">LIVE</span>
          </div>
          <ProbBar label={`${match.home} Win`} modelProb={match.model1X2.home} bookProb={match.book1X2.home} color="var(--accent-teal)" />
          <ProbBar label="Draw" modelProb={match.model1X2.draw} bookProb={match.book1X2.draw} color="var(--accent-blue)" />
          <ProbBar label={`${match.away} Win`} modelProb={match.model1X2.away} bookProb={match.book1X2.away} color="var(--accent-purple)" />
        </div>

        {/* Neural Heatmap */}
        <div className="card animate-in animate-in-delay-3">
          {neuralData ? (
            <NeuralHeatmap matrix={neuralData.neuralHeatmap} confidence={neuralData.confidence} />
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-teal)' }}>
              🧠 Neural Network Processing...
            </div>
          )}
        </div>
      </div>
      
      {/* Player Radar Chart */}
      <div className="animate-in animate-in-delay-3" style={{ marginBottom: '24px' }}>
        <PlayerRadar homeLineup={homeLineup} awayLineup={awayLineup} homeTeam={match.home} awayTeam={match.away} />
      </div>

      {/* Starting Lineups Visualization */}
      <div className="card animate-in animate-in-delay-3" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <span className="card-title">👕 Predicted Starting Lineups</span>
          <span className="stat-badge badge-purple">xG Weight Engine Active</span>
        </div>
        <div className="grid grid-2">
          {/* Home Team */}
          <div>
            <h4 style={{ color: 'var(--accent-teal)', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              {match.home} Lineup
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
              {homeLineup.map((player, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '4px', borderLeft: i < 3 ? '2px solid var(--accent-gold)' : '2px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.85rem' }}>{player.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginLeft: '4px' }}>{player.position}</span></span>
                  <span style={{ fontSize: '0.75rem', color: i < 3 ? 'var(--accent-gold)' : 'var(--text-muted)' }}>{player.xgWeight.toFixed(2)} xG</span>
                </div>
              ))}
            </div>
          </div>

          {/* Away Team */}
          <div>
            <h4 style={{ color: 'var(--accent-purple)', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              {match.away} Lineup
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
              {awayLineup.map((player, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '4px', borderLeft: i < 3 ? '2px solid var(--accent-gold)' : '2px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.85rem' }}>{player.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginLeft: '4px' }}>{player.position}</span></span>
                  <span style={{ fontSize: '0.75rem', color: i < 3 ? 'var(--accent-gold)' : 'var(--text-muted)' }}>{player.xgWeight.toFixed(2)} xG</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* The Unified Live Match Center Widgets */}
      <div className="card animate-in animate-in-delay-3" style={{ marginBottom: '24px', padding: '0', overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '16px 20px', background: '#000', borderBottom: '1px solid rgba(255,51,102,0.3)' }}>
          <span className="card-title">🏟️ INSTITUTIONAL LIVE MATCH CENTER</span>
          <span className="stat-badge badge-red">LIVE</span>
        </div>
        
        {match.id.startsWith('real_') ? (
          <div className="grid grid-2" style={{ gap: '0' }}>
            <div style={{ padding: '20px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
              <RealMatchTracker fixtureId={match.fixtureId} apiKey="271556db4a4d80ed481770f150fe82a9" />
            </div>
            <div style={{ padding: '20px' }}>
              <MatchStatisticsWidget fixtureId={match.fixtureId} apiKey="271556db4a4d80ed481770f150fe82a9" />
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px' }}>
            <div style={{ padding: '8px', background: 'rgba(255,215,0,0.1)', color: 'var(--accent-gold)', fontSize: '0.75rem', textAlign: 'center', marginBottom: '16px', borderRadius: '4px' }}>
              ⚠️ PRE-MATCH MODE: Generating Dynamic 3D Match Simulation using xG Weights
            </div>
            <Bet365Pitch match={match} homeRemainingXG={match.lambda} awayRemainingXG={match.mu} />
          </div>
        )}
      </div>

      <div className="grid grid-2" style={{ marginBottom: '40px' }}>
        {/* SGP Builder */}
        <div className="card animate-in animate-in-delay-4">
          <div className="card-header">
            <span className="card-title">🎯 Market Builder</span>
            <span className="stat-badge badge-purple">{sgpLegs.length}/6 Legs</span>
          </div>
          <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
            {availableLegs.map(leg => {
              const isSelected = sgpLegs.find(l => l.id === leg.id);
              const ev = leg.prob * leg.odds - 1;
              return (
                <div key={leg.id} className={`sgp-leg ${isSelected ? 'selected' : ''}`} onClick={() => toggleLeg(leg)}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{leg.label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>True: {(leg.prob * 100).toFixed(1)}% | Odds: {leg.odds.toFixed(2)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.85rem', color: ev > 0 ? 'var(--accent-teal)' : 'var(--accent-red)' }}>
                      {ev > 0 ? '+' : ''}{(ev * 100).toFixed(1)}% EV
                    </div>
                    <div style={{ fontSize: '0.65rem', color: isSelected ? 'var(--accent-teal)' : 'var(--text-muted)' }}>
                      {isSelected ? '■ SELECTED' : '+ ADD'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kelly Calculator */}
        <div className="card animate-in animate-in-delay-4">
          <div className="card-header">
            <span className="card-title">💰 Smart Bankroll & Execution</span>
          </div>

          {sgpLegs.length >= 2 ? (
            <>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '20px', border: '1px solid rgba(0,255,204,0.1)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Combined Odds</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>{combinedOdds.toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Parlay EV</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: parlayEV > 0 ? 'var(--accent-teal)' : 'var(--accent-red)', textShadow: parlayEV > 0 ? '0 0 10px rgba(0,255,204,0.4)' : 'none' }}>
                      {parlayEV > 0 ? '+' : ''}{(parlayEV * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>Kelly Fraction Risk Level</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[{ v: 0.125, l: '⅛ Safe' }, { v: 0.25, l: '¼ Standard' }, { v: 0.5, l: '½ Aggressive' }].map(k => (
                    <button key={k.v} className={`btn ${kellyMode === k.v ? 'btn-primary' : ''}`} onClick={() => setKellyMode(k.v)} style={{ flex: 1 }}>{k.l}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>Active Bankroll ($)</label>
                <input type="number" className="input" style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }} value={bankroll} onChange={e => setBankroll(Number(e.target.value))} />
              </div>

              <button className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem', letterSpacing: '2px' }}>
                RECOMMENDED WAGER: ${kellyStake.toFixed(2)}
              </button>
            </>
          ) : (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px', opacity: 0.5 }}>🎯</div>
              <p style={{ fontSize: '0.85rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Build Market to Calculate Risk</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
