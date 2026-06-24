'use client';

import { useState, useEffect } from 'react';
import { TEAM_ELO } from '../../lib/constants';
import { predictMatch } from '../../lib/dixon-coles';
import { getTeamSentiment } from '../../lib/sentiment-agent';

import Link from 'next/link';

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'live', 'upcoming'

  useEffect(() => {
    async function fetchWorldCupGames() {
      try {
        const res = await fetch('https://worldcup26.ir/get/games');
        if (res.ok) {
          const data = await res.json();
          // Sort by match ID to ensure chronological order
          const sorted = data.games.sort((a, b) => parseInt(a.id) - parseInt(b.id));
          setMatches(sorted);
        }
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch worldcup26.ir", err);
        setLoading(false);
      }
    }
    fetchWorldCupGames();
  }, []);

  const filteredMatches = matches.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return m.time_elapsed === 'notstarted';
    if (filter === 'live') return m.time_elapsed !== 'notstarted' && m.finished === 'FALSE';
    return true;
  });

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--accent-gold)', fontFamily: 'var(--font-display)', letterSpacing: '2px' }}>📡 CONNECTING TO FIFA SERVERS...</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>Fetching official World Cup 2026 scheduling data.</p>
      </div>
    );
  }

  return (
    <>
      <div className="card animate-in" style={{ marginBottom: '32px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(255,215,0,0.1), transparent)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--accent-gold)' }}>🏆 OFFICIAL WORLD CUP HUB</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Live Autonomous Data Feed via worldcup26.ir</p>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }} className="animate-in animate-in-delay-1">
        <button className={`btn ${filter === 'all' ? 'btn-primary' : ''}`} onClick={() => setFilter('all')}>🌍 ALL 104 MATCHES</button>
        <button className={`btn ${filter === 'live' ? 'btn-primary' : ''}`} onClick={() => setFilter('live')}>🔴 LIVE NOW</button>
        <button className={`btn ${filter === 'upcoming' ? 'btn-primary' : ''}`} onClick={() => setFilter('upcoming')}>📅 UPCOMING</button>
      </div>

      <div className="grid grid-3 animate-in animate-in-delay-2">
        {filteredMatches.map(match => {
          const homeTeam = match.home_team_name_en || match.home_team_label;
          const awayTeam = match.away_team_name_en || match.away_team_label;
          const isLive = match.time_elapsed !== 'notstarted' && match.finished === 'FALSE';
          const isFinished = match.finished === 'TRUE';
          
          return (
            <div key={match._id} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                <span className="stat-badge badge-blue">Group {match.group}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Match {match.id}</span>
              </div>
              
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', marginBottom: '8px', letterSpacing: '1px' }}>
                  {match.local_date.split(' ')[0]}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', fontSize: '1.1rem', fontWeight: 600 }}>
                  <div style={{ flex: 1, textAlign: 'right', wordBreak: 'break-word' }}>{homeTeam}</div>
                  
                  <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {isLive || isFinished ? (
                      <span style={{ whiteSpace: 'nowrap', background: isLive ? 'rgba(255,51,102,0.2)' : 'rgba(255,255,255,0.1)', padding: '4px 16px', borderRadius: '8px', color: isLive ? 'var(--accent-red)' : '#fff', fontWeight: 800, fontSize: '1.4rem' }}>
                        {match.home_score} - {match.away_score}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>VS</span>
                    )}
                    {isLive && <span style={{ fontSize: '0.65rem', color: 'var(--accent-red)', marginTop: '4px', animation: 'pulse 1.5s infinite' }}>{match.time_elapsed}'</span>}
                  </div>
                  
                  <div style={{ flex: 1, textAlign: 'left', wordBreak: 'break-word' }}>{awayTeam}</div>
                </div>
              </div>

              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '16px' }}>
                🏟️ Stadium ID: {match.stadium_id}
              </div>

              <Link href={`/predictions?matchId=${match.id}`} className="btn" style={{ width: '100%', textAlign: 'center', display: 'block', background: 'rgba(0,255,204,0.1)', color: 'var(--accent-teal)' }}>
                🧠 LOAD AI MARKET
              </Link>
            </div>
          )
        })}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}} />
    </>
  );
}
