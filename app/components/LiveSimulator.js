'use client';

import { useState, useMemo } from 'react';
import { generateScorelineMatrix, derive1X2 } from '../../lib/dixon-coles';
import { calculatePlayerGoalProb } from '../../lib/player-data';

export default function LiveSimulator({ match, homeLineup, awayLineup }) {
  const [currentMinute, setCurrentMinute] = useState(0);
  const [currentHomeScore, setCurrentHomeScore] = useState(0);
  const [currentAwayScore, setCurrentAwayScore] = useState(0);

  const { liveProbabilities, homeRemainingXG, awayRemainingXG } = useMemo(() => {
    // Linear time decay (standard basic in-play model)
    const remainingTimeFactor = Math.max(0, (90 - currentMinute) / 90);
    
    // Scale the base xG
    const remainingLambda = match.lambda * remainingTimeFactor;
    const remainingMu = match.mu * remainingTimeFactor;

    // Recalculate remaining probability matrix
    const remainingMatrix = generateScorelineMatrix(remainingLambda, remainingMu, match.rho, 5);

    // Sum probabilities adjusting for the current score
    let homeWin = 0, draw = 0, awayWin = 0;
    
    for (let i = 0; i < remainingMatrix.length; i++) {
      for (let j = 0; j < remainingMatrix[i].length; j++) {
        const prob = remainingMatrix[i][j];
        const finalHome = currentHomeScore + i;
        const finalAway = currentAwayScore + j;

        if (finalHome > finalAway) homeWin += prob;
        else if (finalHome === finalAway) draw += prob;
        else awayWin += prob;
      }
    }

    // Normalize
    const total = homeWin + draw + awayWin || 1;
    
    return {
      liveProbabilities: {
        home: homeWin / total,
        draw: draw / total,
        away: awayWin / total
      },
      homeRemainingXG: remainingLambda,
      awayRemainingXG: remainingMu
    };
  }, [currentMinute, currentHomeScore, currentAwayScore, match]);

  return (
    <div className="card" style={{ marginBottom: '24px', border: '1px solid var(--accent-orange)' }}>
      <div className="card-header" style={{ borderBottom: '1px solid rgba(255, 136, 0, 0.2)' }}>
        <span className="card-title" style={{ color: 'var(--accent-orange)' }}>
          ⏱️ Live Match In-Play Simulator
        </span>
      </div>
      
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label className="input-label">Current Minute</label>
            <input type="range" min="0" max="90" value={currentMinute} onChange={e => setCurrentMinute(Number(e.target.value))} style={{ width: '100%' }} />
            <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{currentMinute}'</div>
          </div>
          <div>
            <label className="input-label">{match.home} Goals</label>
            <input type="number" min="0" value={currentHomeScore} onChange={e => setCurrentHomeScore(Number(e.target.value))} className="input" />
          </div>
          <div>
            <label className="input-label">{match.away} Goals</label>
            <input type="number" min="0" value={currentAwayScore} onChange={e => setCurrentAwayScore(Number(e.target.value))} className="input" />
          </div>
        </div>

        {/* Live Probabilities */}
        <h4 style={{ marginBottom: '12px', fontSize: '0.85rem' }}>Live Full-Time Probabilities</h4>
        <div style={{ display: 'flex', height: '32px', borderRadius: '8px', overflow: 'hidden', marginBottom: '24px' }}>
          <div style={{ width: `${liveProbabilities.home * 100}%`, background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 700, fontSize: '0.8rem', transition: 'width 0.3s ease' }}>
            {liveProbabilities.home > 0.1 ? `${(liveProbabilities.home * 100).toFixed(1)}%` : ''}
          </div>
          <div style={{ width: `${liveProbabilities.draw * 100}%`, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 700, fontSize: '0.8rem', transition: 'width 0.3s ease' }}>
            {liveProbabilities.draw > 0.1 ? `${(liveProbabilities.draw * 100).toFixed(1)}%` : ''}
          </div>
          <div style={{ width: `${liveProbabilities.away * 100}%`, background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.8rem', transition: 'width 0.3s ease' }}>
            {liveProbabilities.away > 0.1 ? `${(liveProbabilities.away * 100).toFixed(1)}%` : ''}
          </div>
        </div>

        {/* Live Player Goal Probs */}
        <div className="grid grid-2" style={{ gap: '16px' }}>
          <div>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{match.home} Live Next/Anytime Goalscorer</h4>
            {homeLineup.slice(0, 3).map((player, i) => {
              const prob = calculatePlayerGoalProb(homeRemainingXG, player.xgWeight);
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '4px', fontSize: '0.8rem' }}>
                  <span>{player.name} ({player.pos})</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-green)' }}>{(prob * 100).toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
          <div>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{match.away} Live Next/Anytime Goalscorer</h4>
            {awayLineup.slice(0, 3).map((player, i) => {
              const prob = calculatePlayerGoalProb(awayRemainingXG, player.xgWeight);
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '4px', fontSize: '0.8rem' }}>
                  <span>{player.name} ({player.pos})</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)' }}>{(prob * 100).toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
