'use client';

import { useState, useEffect, useRef } from 'react';

const PITCH_EVENTS = [
  { type: 'SAFE_POSSESSION', labels: ['Safe Possession', 'Building from the Back'] },
  { type: 'DANGEROUS_ATTACK', labels: ['Dangerous Attack!', 'Entering Final Third'] },
  { type: 'SHOT_OFF_TARGET', labels: ['Shot Off Target', 'Missed Chance'] },
  { type: 'SHOT_ON_TARGET', labels: ['Shot On Target!', 'Great Save!'] },
  { type: 'CORNER', labels: ['Corner Kick'] },
  { type: 'FREE_KICK', labels: ['Dangerous Free Kick'] },
  { type: 'GOAL', labels: ['GOAL!!!', 'WHAT A STRIKE!'] }
];

export default function Bet365Pitch({ match, homeRemainingXG = 1.5, awayRemainingXG = 1.2 }) {
  const [ballPos, setBallPos] = useState({ x: 50, y: 50 }); // percentages
  const [currentEvent, setCurrentEvent] = useState('Kick Off');
  const [eventTeam, setEventTeam] = useState('Neutral');
  const [eventColor, setEventColor] = useState('#fff');
  const [possession, setPossession] = useState({ home: 50, away: 50 });
  const [stats, setStats] = useState({ home: { shots: 0, onTarget: 0, corners: 0 }, away: { shots: 0, onTarget: 0, corners: 0 } });
  
  const tickRef = useRef(null);

  useEffect(() => {
    const totalXG = homeRemainingXG + awayRemainingXG || 1;
    const homeWeight = homeRemainingXG / totalXG;
    
    const updatePossession = () => {
      const p = Math.max(30, Math.min(70, Math.round((homeWeight * 100) + (Math.random() * 10 - 5))));
      setPossession({ home: p, away: 100 - p });
    };

    const simulateTick = () => {
      const rand = Math.random();
      const isHome = Math.random() < homeWeight;
      const attackingTeam = isHome ? match?.home || 'Home' : match?.away || 'Away';
      const teamKey = isHome ? 'home' : 'away';

      setEventTeam(attackingTeam);

      let eventObj, targetX, targetY, color;

      if (rand < 0.5) { 
        eventObj = PITCH_EVENTS[0];
        targetX = isHome ? 25 + Math.random() * 25 : 75 - Math.random() * 25;
        targetY = 20 + Math.random() * 60;
        color = '#00ffcc'; // Teal
      } else if (rand < 0.8) { 
        eventObj = PITCH_EVENTS[1];
        targetX = isHome ? 75 + Math.random() * 15 : 25 - Math.random() * 15;
        targetY = 20 + Math.random() * 60;
        color = '#ff9900'; // Orange
      } else if (rand < 0.9) { 
        eventObj = PITCH_EVENTS[2];
        targetX = isHome ? 95 : 5;
        targetY = 40 + Math.random() * 20;
        color = '#ff3366'; // Red
        setStats(s => ({ ...s, [teamKey]: { ...s[teamKey], shots: s[teamKey].shots + 1 } }));
      } else if (rand < 0.95) { 
        eventObj = PITCH_EVENTS[3];
        targetX = isHome ? 100 : 0;
        targetY = 50;
        color = '#00fa9a'; // Green
        setStats(s => ({ ...s, [teamKey]: { ...s[teamKey], shots: s[teamKey].shots + 1, onTarget: s[teamKey].onTarget + 1 } }));
      } else if (rand < 0.98) { 
        eventObj = PITCH_EVENTS[4];
        targetX = isHome ? 100 : 0;
        targetY = Math.random() > 0.5 ? 0 : 100;
        color = '#9d4edd'; // Purple
        setStats(s => ({ ...s, [teamKey]: { ...s[teamKey], corners: s[teamKey].corners + 1 } }));
      } else { 
        eventObj = PITCH_EVENTS[5];
        targetX = isHome ? 60 + Math.random() * 20 : 40 - Math.random() * 20;
        targetY = 10 + Math.random() * 80;
        color = '#ffd700'; // Gold
      }

      setBallPos({ x: targetX, y: targetY });
      setCurrentEvent(eventObj.labels[Math.floor(Math.random() * eventObj.labels.length)]);
      setEventColor(color);
      updatePossession();
    };

    tickRef.current = setInterval(simulateTick, 4000); // 4 seconds per tick
    return () => clearInterval(tickRef.current);
  }, [match, homeRemainingXG, awayRemainingXG]);

  return (
    <div style={{ width: '100%', background: '#0a0d14', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
      
      {/* Top Header */}
      <div style={{ background: 'linear-gradient(90deg, rgba(0,255,204,0.1) 0%, rgba(0,0,0,0) 50%, rgba(255,51,102,0.1) 100%)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ flex: 1, textAlign: 'left', fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: '#00ffcc' }}>{match?.home || 'Home'}</div>
        <div style={{ padding: '4px 12px', background: 'rgba(255,0,0,0.1)', border: '1px solid #ff3366', borderRadius: '20px', fontSize: '0.7rem', color: '#ff3366', animation: 'pulse 2s infinite', letterSpacing: '1px', fontWeight: 800 }}>LIVE TRACKER</div>
        <div style={{ flex: 1, textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: '#ff3366' }}>{match?.away || 'Away'}</div>
      </div>

      {/* 3D PITCH ENGINE */}
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        height: '280px', 
        background: '#040d07', // Deep background space
        perspective: '1000px', // The key to the 3D effect
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        
        {/* The Transformed Pitch Plane */}
        <div style={{
          position: 'absolute',
          width: '90%',
          height: '140%', // Taller before rotation
          background: 'repeating-linear-gradient(0deg, #183e20 0%, #183e20 10%, #1e4a27 10%, #1e4a27 20%)',
          border: '2px solid rgba(255,255,255,0.8)',
          boxShadow: '0 0 20px rgba(0,255,204,0.1)',
          transform: 'rotateX(60deg) scale(1.1)',
          transformOrigin: 'center center',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {/* SVG Pitch Markings Layer */}
          <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
            {/* Center Line */}
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
            {/* Center Circle */}
            <circle cx="50%" cy="50%" r="15%" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
            <circle cx="50%" cy="50%" r="1%" fill="rgba(255,255,255,0.8)" />
            
            {/* Home Penalty Area */}
            <rect x="0" y="25%" width="15%" height="50%" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
            <rect x="0" y="38%" width="5%" height="24%" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
            <path d="M 15% 42% A 8% 8% 0 0 1 15% 58%" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />

            {/* Away Penalty Area */}
            <rect x="85%" y="25%" width="15%" height="50%" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
            <rect x="95%" y="38%" width="5%" height="24%" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
            <path d="M 85% 58% A 8% 8% 0 0 1 85% 42%" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
          </svg>

          {/* 3D Animated Ball */}
          <div style={{
            position: 'absolute',
            top: `${ballPos.y}%`,
            left: `${ballPos.x}%`,
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #ffffff, #aaaaaa)',
            boxShadow: '-4px 10px 10px rgba(0,0,0,0.7)', // Heavy drop shadow for 3D float
            transform: 'translate(-50%, -50%)',
            transition: 'all 2s cubic-bezier(0.25, 1, 0.5, 1)',
            zIndex: 10
          }} />
          
          {/* Action Ring beneath ball */}
          <div style={{
            position: 'absolute',
            top: `${ballPos.y}%`,
            left: `${ballPos.x}%`,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: `2px solid ${eventColor}`,
            opacity: 0.5,
            transform: 'translate(-50%, -50%)',
            transition: 'all 2s cubic-bezier(0.25, 1, 0.5, 1)',
            animation: 'pulse 1.5s infinite',
            zIndex: 9
          }} />
        </div>

        {/* Floating Billboard Overlay */}
        <div style={{
          position: 'absolute',
          top: '20px',
          background: 'rgba(0,0,0,0.8)',
          borderTop: `2px solid ${eventColor}`,
          padding: '12px 30px',
          borderRadius: '4px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backdropFilter: 'blur(8px)',
          transition: 'border-color 0.5s',
          zIndex: 20
        }}>
          <div style={{ fontSize: '0.75rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>{eventTeam}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: eventColor, transition: 'color 0.5s', textShadow: `0 0 10px ${eventColor}` }}>{currentEvent}</div>
        </div>
      </div>

      {/* Real-time Statistics Panel */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '1px' }}>
          <span style={{ color: '#00ffcc' }}>{possession.home}%</span>
          <span style={{ color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ball Possession</span>
          <span style={{ color: '#ff3366' }}>{possession.away}%</span>
        </div>
        <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${possession.home}%`, background: '#00ffcc', transition: 'width 2s' }} />
          <div style={{ width: `${possession.away}%`, background: '#ff3366', transition: 'width 2s' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '8px' }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '4px' }}>Attacks</div>
            <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>
              <span style={{ color: '#00ffcc' }}>{Math.floor(stats.home.shots * 3.5)}</span> <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span> <span style={{ color: '#ff3366' }}>{Math.floor(stats.away.shots * 3.5)}</span>
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '4px' }}>Shots on Target</div>
            <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>
              <span style={{ color: '#00ffcc' }}>{stats.home.onTarget}</span> <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span> <span style={{ color: '#ff3366' }}>{stats.away.onTarget}</span>
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '4px' }}>Corners</div>
            <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>
              <span style={{ color: '#00ffcc' }}>{stats.home.corners}</span> <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span> <span style={{ color: '#ff3366' }}>{stats.away.corners}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
