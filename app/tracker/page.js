'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'bigfish_bet_history';

function loadBets() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveBets(bets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bets));
}

// ─── SVG Equity Curve Component ──────────────────────────
function EquityCurveSVG({ data }) {
  if (!data || data.length < 2) return (
    <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      Not enough data to plot equity curve.
    </div>
  );

  const padding = 20;
  const width = 800;
  const height = 200;
  
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 100);
  
  const range = max - min;
  
  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M ${points[0].split(',')[0]},${height - padding} L ${points.join(' L ')} L ${points[points.length-1].split(',')[0]},${height - padding} Z`;

  const isProfitable = data[data.length - 1] >= 0;
  const strokeColor = isProfitable ? 'var(--accent-teal)' : 'var(--accent-red)';
  const fillColor = isProfitable ? 'rgba(0,255,204,0.1)' : 'rgba(255,51,102,0.1)';

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      
      {/* Grid Lines */}
      <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="rgba(255,255,255,0.1)" strokeDasharray="4,4" />
      <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="rgba(255,255,255,0.2)" />
      
      {/* Area and Line */}
      <path d={areaD} fill="url(#areaGradient)" />
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${strokeColor})` }} />
      
      {/* Final Dot */}
      <circle cx={points[points.length-1].split(',')[0]} cy={points[points.length-1].split(',')[1]} r="5" fill="#fff" stroke={strokeColor} strokeWidth="2" style={{ filter: `drop-shadow(0 0 6px ${strokeColor})` }} />
    </svg>
  );
}


export default function TrackerPage() {
  const [bets, setBets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ match: '', legs: '', odds: '', stake: '', result: 'pending' });
  const [terminalLogs, setTerminalLogs] = useState([]);

  useEffect(() => { 
    setBets(loadBets());
    
    // Listen for storage events (when execution-agent logs a bet)
    const handleStorage = () => {
      setBets(loadBets());
      addLog("External execution agent pushed new wager.");
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (bets.length > 0 && terminalLogs.length === 0) {
      addLog("System initialized.");
      addLog(`Loaded ${bets.length} historical wagers from local vault.`);
      addLog("Listening for auto-pilot execution events...");
    }
  }, [bets]);

  function addLog(msg) {
    const time = new Date().toISOString().split('T')[1].slice(0, 12);
    setTerminalLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50));
  }

  function addBet() {
    const newBet = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      match: form.match,
      legs: form.legs,
      odds: parseFloat(form.odds) || 1,
      stake: parseFloat(form.stake) || 0,
      result: form.result,
      pnl: form.result === 'won' ? (parseFloat(form.stake) * (parseFloat(form.odds) - 1)) : form.result === 'lost' ? -parseFloat(form.stake) : 0,
      isAutoExecuted: false
    };
    const updated = [newBet, ...bets];
    setBets(updated);
    saveBets(updated);
    addLog(`Manual wager logged: ${form.match} - ${form.legs}`);
    setForm({ match: '', legs: '', odds: '', stake: '', result: 'pending' });
    setShowForm(false);
  }

  function updateResult(id, result) {
    const updated = bets.map(b => {
      if (b.id === id) {
        const pnl = result === 'won' ? (b.stake * (b.odds - 1)) : result === 'lost' ? -b.stake : 0;
        addLog(`Wager ID ${id} settled as ${result.toUpperCase()}. P&L: $${pnl.toFixed(2)}`);
        return { ...b, result, pnl };
      }
      return b;
    });
    setBets(updated);
    saveBets(updated);
  }

  function deleteBet(id) {
    const updated = bets.filter(b => b.id !== id);
    setBets(updated);
    saveBets(updated);
    addLog(`Wager ID ${id} deleted.`);
  }

  // Analytics Math
  const settled = bets.filter(b => b.result !== 'pending').reverse(); // oldest to newest for curve
  const wins = settled.filter(b => b.result === 'won').length;
  const losses = settled.filter(b => b.result === 'lost').length;
  const totalPnL = settled.reduce((sum, b) => sum + b.pnl, 0);
  const totalStaked = settled.reduce((sum, b) => sum + b.stake, 0);
  const roi = totalStaked > 0 ? ((totalPnL / totalStaked) * 100).toFixed(1) : '0.0';
  const winRate = settled.length > 0 ? ((wins / settled.length) * 100).toFixed(1) : '0.0';

  let runningPnL = 0;
  let maxDrawdown = 0;
  let peak = 0;
  
  const equityCurve = [0]; // Start at 0
  settled.forEach(b => { 
    runningPnL += b.pnl; 
    equityCurve.push(runningPnL);
    if (runningPnL > peak) peak = runningPnL;
    const drawdown = peak - runningPnL;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  });

  // Calculate simple pseudo-Sharpe (daily standard dev approximation for demo)
  const avgPnL = settled.length > 0 ? totalPnL / settled.length : 0;
  const variance = settled.length > 0 ? settled.reduce((sum, b) => sum + Math.pow(b.pnl - avgPnL, 2), 0) / settled.length : 0;
  const stdDev = Math.sqrt(variance);
  const sharpe = stdDev > 0 ? (avgPnL / stdDev) * Math.sqrt(365) : 0; // Annualized assuming 1 bet/day avg

  return (
    <>
      <div className="card animate-in" style={{ marginBottom: '32px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(157, 78, 221, 0.1), rgba(0, 255, 204, 0.05))' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--accent-purple)' }}>🏛️ HEDGE FUND DASHBOARD</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Institutional-Grade Analytics • Live Execution Feed • Equity Curve</p>
      </div>

      <div className="grid grid-2" style={{ marginBottom: '32px', gap: '24px' }}>
        
        {/* Left Col: Analytics & Curve */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Top KPIs */}
          <div className="grid grid-2" style={{ gap: '16px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Net Profit / Loss</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: totalPnL >= 0 ? 'var(--accent-teal)' : 'var(--accent-red)' }}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </div>
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Return on Investment</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: parseFloat(roi) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {roi}%
              </div>
            </div>
          </div>

          {/* Equity Curve SVG */}
          <div className="card" style={{ padding: '20px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span className="card-title">📈 Cumulative Equity Curve</span>
              <span className="stat-badge badge-blue">{settled.length} Settled</span>
            </div>
            <div style={{ height: '220px', width: '100%', position: 'relative' }}>
              <EquityCurveSVG data={equityCurve} />
            </div>
          </div>

          {/* Deep Analytics */}
          <div className="card grid grid-3" style={{ gap: '16px', padding: '16px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Win Rate</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', color: '#fff' }}>{winRate}%</div>
            </div>
            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sharpe Ratio</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', color: sharpe > 1.5 ? 'var(--accent-gold)' : '#fff' }}>{sharpe.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Max Drawdown</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', color: 'var(--accent-red)' }}>${maxDrawdown.toFixed(2)}</div>
            </div>
          </div>

        </div>

        {/* Right Col: Terminal & Active Bets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Live Execution Terminal */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', height: '200px', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ background: '#000', borderBottom: '1px solid #333' }}>
              <span className="card-title" style={{ color: '#0f0', fontFamily: 'var(--font-mono)' }}>&gt;_ SYSTEM LOG</span>
            </div>
            <div style={{ flex: 1, background: '#050505', color: '#0f0', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {terminalLogs.length === 0 ? (
                <div style={{ opacity: 0.5 }}>Awaiting execution events...</div>
              ) : (
                terminalLogs.map((log, i) => (
                  <div key={i} style={{ opacity: Math.max(0.3, 1 - (i * 0.15)) }}>{log}</div>
                ))
              )}
            </div>
          </div>

          {/* Bet Ledger */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="card-title">📋 Active Ledger</span>
              <button className="btn" onClick={() => setShowForm(!showForm)} style={{ padding: '4px 8px', fontSize: '0.7rem' }}>
                {showForm ? '✕ Close' : '+ Manual Entry'}
              </button>
            </div>
            
            {showForm && (
              <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="grid grid-2" style={{ gap: '12px' }}>
                  <input className="input" placeholder="Match (e.g. Brazil v France)" value={form.match} onChange={e => setForm({...form, match: e.target.value})} />
                  <input className="input" placeholder="Selection (e.g. Home ML)" value={form.legs} onChange={e => setForm({...form, legs: e.target.value})} />
                  <input className="input" type="number" placeholder="Decimal Odds (e.g. 2.10)" value={form.odds} onChange={e => setForm({...form, odds: e.target.value})} />
                  <input className="input" type="number" placeholder="Stake ($)" value={form.stake} onChange={e => setForm({...form, stake: e.target.value})} />
                </div>
                <button className="btn btn-primary" onClick={addBet} style={{ width: '100%', marginTop: '12px', padding: '10px' }}>💾 SUBMIT TO LEDGER</button>
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px' }}>
              {bets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No ledger entries found.</div>
              ) : (
                bets.map(bet => (
                  <div key={bet.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px',
                    borderLeft: `3px solid ${bet.result === 'won' ? 'var(--accent-teal)' : bet.result === 'lost' ? 'var(--accent-red)' : 'var(--accent-gold)'}`,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {bet.match}
                        {bet.isAutoExecuted && <span style={{ fontSize: '0.55rem', background: 'var(--accent-purple)', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontWeight: 800 }}>AUTO</span>}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{bet.legs} • {bet.date}</div>
                    </div>
                    
                    <div style={{ textAlign: 'right', minWidth: '100px' }}>
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>@{bet.odds.toFixed(2)}</span>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>${bet.stake.toFixed(2)}</span>
                      </div>
                      {bet.result === 'pending' ? (
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button onClick={() => updateResult(bet.id, 'won')} style={{ background: 'rgba(0,255,204,0.15)', border: '1px solid rgba(0,255,204,0.3)', color: 'var(--accent-teal)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.65rem' }}>WON</button>
                          <button onClick={() => updateResult(bet.id, 'lost')} style={{ background: 'rgba(255,51,102,0.15)', border: '1px solid rgba(255,51,102,0.3)', color: 'var(--accent-red)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.65rem' }}>LOST</button>
                          <button onClick={() => deleteBet(bet.id)} style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.65rem' }}>DEL</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.65rem', color: bet.result === 'won' ? 'var(--accent-teal)' : 'var(--accent-red)', textTransform: 'uppercase', fontWeight: 700 }}>{bet.result}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: bet.pnl >= 0 ? 'var(--accent-teal)' : 'var(--accent-red)' }}>
                            {bet.pnl >= 0 ? '+' : ''}${bet.pnl.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
