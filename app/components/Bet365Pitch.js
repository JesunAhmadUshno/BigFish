'use client';

import { useState, useEffect, useMemo, useRef } from 'react';

const PITCH_EVENTS = [
  { type: 'SAFE_POSSESSION', labels: ['Safe Possession', 'Building from the Back'] },
  { type: 'DANGEROUS_ATTACK', labels: ['Dangerous Attack!', 'Entering Final Third'] },
  { type: 'SHOT_OFF_TARGET', labels: ['Shot Off Target', 'Missed Chance'] },
  { type: 'SHOT_ON_TARGET', labels: ['Shot On Target!', 'Great Save!'] },
  { type: 'CORNER', labels: ['Corner Kick'] },
  { type: 'FREE_KICK', labels: ['Dangerous Free Kick'] },
  { type: 'GOAL', labels: ['GOAL!!!', 'WHAT A STRIKE!'] }
];

export default function Bet365Pitch({ match, homeRemainingXG, awayRemainingXG }) {
  const [ballPos, setBallPos] = useState({ x: 50, y: 50 }); // percentages
  const [currentEvent, setCurrentEvent] = useState('Kick Off');
  const [eventTeam, setEventTeam] = useState('Neutral');
  const [eventColor, setEventColor] = useState('var(--text-secondary)');
  const [possession, setPossession] = useState({ home: 50, away: 50 });
  const [stats, setStats] = useState({ home: { shots: 0, onTarget: 0, corners: 0 }, away: { shots: 0, onTarget: 0, corners: 0 } });
  
  const tickRef = useRef(null);

  // The Simulation Engine
  useEffect(() => {
    // Total "momentum" pool based on remaining expected goals
    const totalXG = homeRemainingXG + awayRemainingXG || 1;
    const homeWeight = homeRemainingXG / totalXG;
    
    // Smoothly update possession based on xG weight (with some randomness)
    const updatePossession = () => {
      const p = Math.max(30, Math.min(70, Math.round((homeWeight * 100) + (Math.random() * 10 - 5))));
      setPossession({ home: p, away: 100 - p });
    };

    const simulateTick = () => {
      const rand = Math.random();
      const isHome = Math.random() < homeWeight;
      const attackingTeam = isHome ? match.home : match.away;
      const defendingTeam = isHome ? match.away : match.home;
      const teamKey = isHome ? 'home' : 'away';

      setEventTeam(attackingTeam);

      // Determine the event based on probabilities
      let eventObj, targetX, targetY, color;

      if (rand < 0.5) { // 50% chance of safe possession
        eventObj = PITCH_EVENTS[0];
        targetX = isHome ? 25 + Math.random() * 25 : 75 - Math.random() * 25;
        targetY = 20 + Math.random() * 60;
        color = 'var(--accent-teal)';
      } else if (rand < 0.8) { // 30% chance of dangerous attack
        eventObj = PITCH_EVENTS[1];
        targetX = isHome ? 75 + Math.random() * 15 : 25 - Math.random() * 15;
        targetY = 20 + Math.random() * 60;
        color = 'var(--accent-orange)';
      } else if (rand < 0.9) { // 10% chance of shot off target
        eventObj = PITCH_EVENTS[2];
        targetX = isHome ? 95 : 5;
        targetY = 40 + Math.random() * 20;
        color = 'var(--accent-red)';
        setStats(s => ({ ...s, [teamKey]: { ...s[teamKey], shots: s[teamKey].shots + 1 } }));
      } else if (rand < 0.95) { // 5% chance of shot on target
        eventObj = PITCH_EVENTS[3];
        targetX = isHome ? 100 : 0;
        targetY = 50;
        color = 'var(--accent-green)';
        setStats(s => ({ ...s, [teamKey]: { ...s[teamKey], shots: s[teamKey].shots + 1, onTarget: s[teamKey].onTarget + 1 } }));
      } else if (rand < 0.98) { // 3% chance of corner
        eventObj = PITCH_EVENTS[4];
        targetX = isHome ? 100 : 0;
        targetY = Math.random() > 0.5 ? 0 : 100;
        color = 'var(--accent-purple)';
        setStats(s => ({ ...s, [teamKey]: { ...s[teamKey], corners: s[teamKey].corners + 1 } }));
      } else { // 2% chance of free kick
        eventObj = PITCH_EVENTS[5];
        targetX = isHome ? 60 + Math.random() * 20 : 40 - Math.random() * 20;
        targetY = 10 + Math.random() * 80;
        color = 'var(--accent-gold)';
      }

      setBallPos({ x: targetX, y: targetY });
      setCurrentEvent(eventObj.labels[Math.floor(Math.random() * eventObj.labels.length)]);
      setEventColor(color);
      updatePossession();
    };

    // Run simulation every 3 seconds
    tickRef.current = setInterval(simulateTick, 3000);
    return () => clearInterval(tickRef.current);
  }, [match, homeRemainingXG, awayRemainingXG]);

  return (
    <div className="card animate-in" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
      
      {/* Top Header - Match Status */}
      <div style={{ background: '#0a0d14', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ flex: 1, textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800 }}>{match.home}</div>
        <div style={{ width: '80px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-red)', animation: 'pulse 2s infinite', letterSpacing: '1px', fontWeight: 700 }}>LIVE</div>
        </div>
        <div style={{ flex: 1, textAlign: 'left', fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800 }}>{match.away}</div>
      </div>

      {/* The Animated Pitch Container */}
      <div style={{ position: 'relative', width: '100%', height: '240px', background: 'linear-gradient(135deg, #091a10 0%, #040d07 100%)', overflow: 'hidden' }}>
        
        {/* Pitch Markings (CSS Drawn) */}
        <div style={{ position: 'absolute', top: '10px', bottom: '10px', left: '10px', right: '10px', border: '2px solid rgba(255,255,255,0.15)', borderRadius: '4px' }} />
        {/* Halfway line */}
        <div style={{ position: 'absolute', top: '10px', bottom: '10px', left: '50%', width: '2px', background: 'rgba(255,255,255,0.15)', transform: 'translateX(-50%)' }} />
        {/* Center circle */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: '60px', height: '60px', border: '2px solid rgba(255,255,255,0.15)', borderRadius: '50%', transform: 'translate(-50%, -50%)' }} />
        {/* Home Penalty Box */}
        <div style={{ position: 'absolute', top: '25%', left: '10px', width: '15%', height: '50%', border: '2px solid rgba(255,255,255,0.15)', borderLeft: 'none' }} />
        {/* Away Penalty Box */}
        <div style={{ position: 'absolute', top: '25%', right: '10px', width: '15%', height: '50%', border: '2px solid rgba(255,255,255,0.15)', borderRight: 'none' }} />
        
        {/* The Ball Marker */}
        <div 
          style={{
            position: 'absolute',
            top: `${ballPos.y}%`,
            left: `${ballPos.x}%`,
            width: '12px',
            height: '12px',
            background: 'var(--accent-teal)',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            transition: 'all 1.5s cubic-bezier(0.25, 1, 0.5, 1)', // Smooth ball movement
            boxShadow: '0 0 10px var(--accent-teal), 0 0 20px var(--accent-teal)'
          }}
        />

        {/* Live Event Ticker Overlay */}
        <div style={{
          position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '8px 24px',
          borderRadius: '20px', border: `1px solid ${eventColor}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'border-color 0.5s'
        }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{eventTeam}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: eventColor, transition: 'color 0.5s' }}>{currentEvent}</div>
        </div>

      </div>

      {/* Real-time Statistics Panel */}
      <div style={{ background: '#0a0d14', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Possession Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
          <span style={{ color: 'var(--accent-teal)' }}>{possession.home}%</span>
          <span style={{ color: 'var(--text-muted)' }}>Possession</span>
          <span style={{ color: 'var(--accent-purple)' }}>{possession.away}%</span>
        </div>
        <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${possession.home}%`, background: 'var(--accent-teal)', transition: 'width 2s' }} />
          <div style={{ width: `${possession.away}%`, background: 'var(--accent-purple)', transition: 'width 2s' }} />
        </div>

        {/* Micro Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '8px' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Attacks</div>
            <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--accent-teal)' }}>{Math.floor(stats.home.shots * 3.5)}</span> - <span style={{ color: 'var(--accent-purple)' }}>{Math.floor(stats.away.shots * 3.5)}</span>
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Shots on Target</div>
            <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--accent-teal)' }}>{stats.home.onTarget}</span> - <span style={{ color: 'var(--accent-purple)' }}>{stats.away.onTarget}</span>
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Corners</div>
            <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--accent-teal)' }}>{stats.home.corners}</span> - <span style={{ color: 'var(--accent-purple)' }}>{stats.away.corners}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
