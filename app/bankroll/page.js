'use client';

import { useState, useEffect, useRef } from 'react';

// ─── Bankroll Growth Chart ──────────────────────────────
function BankrollChart({ data, kelly }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = 240;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const pad = { top: 20, right: 20, bottom: 30, left: 55 };
    const cW = w - pad.left - pad.right;
    const cH = h - pad.top - pad.bottom;

    const allVals = [...data, ...kelly];
    const min = Math.min(...allVals) * 0.95;
    const max = Math.max(...allVals) * 1.05;
    const range = max - min || 1;

    // Grid
    ctx.strokeStyle = 'rgba(100,140,220,0.08)';
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (cH / 5) * i;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
      const val = max - (range / 5) * i;
      ctx.fillStyle = 'rgba(139,157,195,0.5)';
      ctx.font = '10px "JetBrains Mono"';
      ctx.textAlign = 'right';
      ctx.fillText('$' + Math.round(val).toLocaleString(), pad.left - 6, y + 3);
    }

    // Draw line
    function drawLine(arr, color, dashed = false) {
      const gradient = ctx.createLinearGradient(0, pad.top, 0, h);
      gradient.addColorStop(0, color + '20');
      gradient.addColorStop(1, color + '00');

      if (!dashed) {
        ctx.beginPath();
        ctx.moveTo(pad.left, pad.top + cH);
        arr.forEach((v, i) => {
          const x = pad.left + (i / (arr.length - 1)) * cW;
          const y = pad.top + ((max - v) / range) * cH;
          ctx.lineTo(x, y);
        });
        ctx.lineTo(pad.left + cW, pad.top + cH);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      ctx.beginPath();
      if (dashed) ctx.setLineDash([6, 4]);
      arr.forEach((v, i) => {
        const x = pad.left + (i / (arr.length - 1)) * cW;
        const y = pad.top + ((max - v) / range) * cH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = dashed ? 1.5 : 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    drawLine(kelly, '#a855f7', true);
    drawLine(data, '#00ff88', false);

    // X-axis
    ctx.fillStyle = 'rgba(139,157,195,0.5)';
    ctx.font = '9px "JetBrains Mono"';
    ctx.textAlign = 'center';
    data.forEach((_, i) => {
      if (i % 5 === 0 || i === data.length - 1) {
        ctx.fillText(`Bet ${i}`, pad.left + (i / (data.length - 1)) * cW, h - 8);
      }
    });
  }, [data, kelly]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '240px', display: 'block' }} />;
}

// ─── Gauge Component ────────────────────────────────────
function RiskGauge({ value, max = 100, label, color }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct * 0.75); // 270 degree arc

  return (
    <div className="gauge-container">
      <svg className="gauge-svg" width="120" height="120" viewBox="0 0 120 120">
        {/* Background arc */}
        <circle cx="60" cy="60" r={radius} fill="none"
          stroke="rgba(100,140,220,0.1)" strokeWidth="8"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap="round" />
        {/* Value arc */}
        <circle cx="60" cy="60" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${circumference * 0.75 * pct} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease', filter: `drop-shadow(0 0 6px ${color}40)` }} />
      </svg>
      <div className="gauge-label">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color }}>
          {value.toFixed(1)}%
        </div>
        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{label}</div>
      </div>
    </div>
  );
}

export default function BankrollPage() {
  const [bankroll, setBankroll] = useState(5000);
  const [kellyMode, setKellyMode] = useState(0.25);
  const [showHistory, setShowHistory] = useState(true);

  // Sample bet history
  const betHistory = [
    { id: 1, match: 'Argentina vs Saudi Arabia', type: 'SGP', legs: 'ARG ML + Under 3.5', odds: 2.15, stake: 125, won: true, clv: 3.2, date: '2026-06-12' },
    { id: 2, match: 'Germany vs Japan', type: '1X2', legs: 'Germany ML', odds: 1.45, stake: 180, won: false, clv: -0.5, date: '2026-06-12' },
    { id: 3, match: 'Brazil vs Serbia', type: 'SGP', legs: 'BRA ML + BTTS No', odds: 2.40, stake: 95, won: true, clv: 4.1, date: '2026-06-13' },
    { id: 4, match: 'England vs Iran', type: 'Over/Under', legs: 'Over 2.5', odds: 1.82, stake: 150, won: true, clv: 2.8, date: '2026-06-13' },
    { id: 5, match: 'Argentina vs Mexico', type: 'SGP', legs: 'ARG ML + Under 2.5', odds: 2.85, stake: 80, won: true, clv: 5.2, date: '2026-06-14' },
    { id: 6, match: 'Spain vs Costa Rica', type: '1X2', legs: 'Spain ML', odds: 1.18, stake: 200, won: true, clv: 1.9, date: '2026-06-14' },
    { id: 7, match: 'Croatia vs Canada', type: 'Over/Under', legs: 'Under 2.5', odds: 2.10, stake: 110, won: false, clv: -1.2, date: '2026-06-15' },
    { id: 8, match: 'France vs Denmark', type: 'SGP', legs: 'Draw + Under 2.5', odds: 4.50, stake: 45, won: false, clv: 1.5, date: '2026-06-15' },
    { id: 9, match: 'Brazil vs Switzerland', type: '1X2', legs: 'Brazil ML', odds: 1.52, stake: 165, won: true, clv: 2.3, date: '2026-06-16' },
    { id: 10, match: 'Portugal vs Uruguay', type: 'SGP', legs: 'POR ML + Over 1.5', odds: 1.95, stake: 135, won: true, clv: 3.7, date: '2026-06-16' },
  ];

  // Calculate stats
  const wins = betHistory.filter(b => b.won).length;
  const losses = betHistory.filter(b => !b.won).length;
  const winRate = (wins / betHistory.length * 100);
  const totalStaked = betHistory.reduce((s, b) => s + b.stake, 0);
  const totalReturn = betHistory.reduce((s, b) => s + (b.won ? b.stake * b.odds : 0), 0);
  const roi = ((totalReturn - totalStaked) / totalStaked * 100);
  const profitLoss = totalReturn - totalStaked;

  // Bankroll progression
  const bankrollData = [5000];
  let running = 5000;
  betHistory.forEach(b => {
    if (b.won) running += b.stake * (b.odds - 1);
    else running -= b.stake;
    bankrollData.push(Math.round(running));
  });

  // Theoretical Kelly curve (smoother growth)
  const kellyData = [5000];
  let kellyRunning = 5000;
  betHistory.forEach((_, i) => {
    kellyRunning *= 1 + (roi / 100 / betHistory.length) * 1.2;
    kellyData.push(Math.round(kellyRunning));
  });

  const currentBankroll = bankrollData[bankrollData.length - 1];
  const maxBankroll = Math.max(...bankrollData);
  const drawdown = ((maxBankroll - currentBankroll) / maxBankroll * 100);

  const activeBets = [
    { match: 'Colombia vs DR Congo', type: 'SGP', legs: 'COL ML + Under 3.5', odds: 2.30, stake: 105, ev: '+11.2%' },
    { match: 'Argentina vs Austria', type: '1X2', legs: 'Argentina ML', odds: 1.35, stake: 180, ev: '+8.2%' },
    { match: 'Brazil vs Scotland', type: 'SGP', legs: 'BRA 2H Spread + Fouls Over', odds: 2.65, stake: 75, ev: '+9.5%' },
  ];

  return (
    <>
      <div className="page-header animate-in">
        <h1>💰 Bankroll Manager</h1>
        <p>Fractional Kelly capital management — track, size, and optimize your betting portfolio</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-4" style={{ marginBottom: '24px' }}>
        <div className="card animate-in animate-in-delay-1">
          <div className="card-header">
            <span className="card-title">Current Bankroll</span>
          </div>
          <div className="card-value text-green">${currentBankroll.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: profitLoss > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {profitLoss > 0 ? '+' : ''}{profitLoss.toFixed(0)} ({roi > 0 ? '+' : ''}{roi.toFixed(1)}% ROI)
          </div>
        </div>

        <div className="card animate-in animate-in-delay-2">
          <div className="card-header">
            <span className="card-title">Win Rate</span>
          </div>
          <div className="card-value text-accent">{winRate.toFixed(1)}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {wins}W — {losses}L ({betHistory.length} bets)
          </div>
        </div>

        <div className="card animate-in animate-in-delay-3">
          <div className="card-header">
            <span className="card-title">Active Exposure</span>
          </div>
          <div className="card-value" style={{ color: 'var(--accent-orange)' }}>
            ${activeBets.reduce((s, b) => s + b.stake, 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {activeBets.length} active bets
          </div>
        </div>

        <div className="card animate-in animate-in-delay-4">
          <div className="card-header">
            <span className="card-title">Max Drawdown</span>
          </div>
          <RiskGauge value={drawdown} max={20} label="Drawdown" color={drawdown < 5 ? '#00ff88' : drawdown < 10 ? '#ffd700' : '#ff3b5c'} />
        </div>
      </div>

      {/* Bankroll Chart */}
      <div className="card animate-in animate-in-delay-2" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <span className="card-title">📈 Bankroll Growth</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#00ff88' }}>● Actual</span>
            <span style={{ fontSize: '0.65rem', color: '#a855f7' }}>- - Kelly Theoretical</span>
          </div>
        </div>
        <BankrollChart data={bankrollData} kelly={kellyData} />
      </div>

      <div className="grid grid-2" style={{ marginBottom: '24px' }}>
        {/* Active Bets */}
        <div className="card animate-in animate-in-delay-3" style={{ borderColor: 'var(--border-glow)' }}>
          <div className="card-header">
            <span className="card-title">🎯 Active Bets</span>
            <span className="live-dot"></span>
          </div>
          {activeBets.map((bet, i) => (
            <div key={i} style={{
              padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)', marginBottom: '8px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{bet.match}</span>
                <span className="stat-badge badge-green" style={{ fontSize: '0.6rem' }}>{bet.ev}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span>{bet.type}: {bet.legs}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  ${bet.stake} @ {bet.odds}
                </span>
              </div>
              <div style={{ marginTop: '6px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Potential: </span>
                <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                  +${(bet.stake * (bet.odds - 1)).toFixed(0)}
                </span>
              </div>
            </div>
          ))}
          <div style={{ marginTop: '8px', fontSize: '0.75rem', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            Total Exposure: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-orange)', fontWeight: 700 }}>
              ${activeBets.reduce((s, b) => s + b.stake, 0)} ({(activeBets.reduce((s, b) => s + b.stake, 0) / currentBankroll * 100).toFixed(1)}% of bankroll)
            </span>
          </div>
        </div>

        {/* Kelly Settings */}
        <div className="card animate-in animate-in-delay-4">
          <div className="card-header">
            <span className="card-title">⚙️ Kelly Configuration</span>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label className="input-label">Kelly Fraction Mode</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { v: 0.125, l: '⅛ Kelly' },
                { v: 0.25, l: '¼ Kelly' },
                { v: 0.5, l: '½ Kelly' },
                { v: 1, l: 'Full' },
              ].map(k => (
                <button key={k.v} className={`btn ${kellyMode === k.v ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => setKellyMode(k.v)} style={{ flex: 1 }}>
                  {k.l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="input-label">Initial Bankroll ($)</label>
            <input type="number" className="input" value={bankroll}
              onChange={e => setBankroll(Number(e.target.value))} />
          </div>

          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <h4 style={{ fontSize: '0.85rem', marginBottom: '12px' }}>Risk Parameters</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.75rem' }}>
              {[
                { label: 'Min EV Threshold', value: '5.0%' },
                { label: 'Max Bet Size', value: '5.0% of bankroll' },
                { label: 'Max Simultaneous', value: '5 bets' },
                { label: 'Max Exposure', value: '15% of bankroll' },
                { label: 'Max Parlay Legs', value: '6 legs' },
                { label: 'Drawdown Limit', value: '20%' },
              ].map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{p.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bet History */}
      <div className="card animate-in animate-in-delay-4">
        <div className="card-header">
          <span className="card-title">📋 Bet History</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? 'Collapse' : 'Expand'}
          </button>
        </div>
        {showHistory && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Match</th>
                <th>Type</th>
                <th>Selection</th>
                <th>Odds</th>
                <th>Stake</th>
                <th>Result</th>
                <th>P/L</th>
                <th>CLV</th>
              </tr>
            </thead>
            <tbody>
              {betHistory.map(bet => (
                <tr key={bet.id}>
                  <td>{bet.date}</td>
                  <td style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {bet.match}
                  </td>
                  <td><span className="stat-badge badge-blue" style={{ fontSize: '0.55rem' }}>{bet.type}</span></td>
                  <td style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bet.legs}</td>
                  <td>{bet.odds.toFixed(2)}</td>
                  <td>${bet.stake}</td>
                  <td>
                    <span className={`stat-badge ${bet.won ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.55rem' }}>
                      {bet.won ? 'WIN' : 'LOSS'}
                    </span>
                  </td>
                  <td style={{
                    color: bet.won ? 'var(--accent-green)' : 'var(--accent-red)',
                    fontWeight: 700,
                  }}>
                    {bet.won ? '+' : '-'}${bet.won ? (bet.stake * (bet.odds - 1)).toFixed(0) : bet.stake}
                  </td>
                  <td style={{ color: bet.clv > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {bet.clv > 0 ? '+' : ''}{bet.clv}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
