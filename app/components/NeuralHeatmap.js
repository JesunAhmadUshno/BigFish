'use client';

export default function NeuralHeatmap({ matrix, confidence }) {
  if (!matrix || matrix.length === 0) return null;
  const maxGoals = matrix.length - 1;

  function getColor(intensity) {
    if (intensity > 0.8) return 'rgba(0, 255, 204, 0.9)'; // High confidence Teal
    if (intensity > 0.5) return 'rgba(0, 250, 154, 0.6)';
    if (intensity > 0.3) return 'rgba(255, 215, 0, 0.5)'; // Gold
    if (intensity > 0.1) return 'rgba(157, 78, 221, 0.3)'; // Purple
    return 'rgba(255, 255, 255, 0.02)';
  }

  return (
    <div className="card animate-in" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
      
      {/* Background Neural Glow effect based on confidence */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '150%', height: '150%', background: `radial-gradient(circle, rgba(0,255,204,${confidence * 0.15}) 0%, transparent 70%)`,
        pointerEvents: 'none', zIndex: 0
      }} />

      <div className="card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px', position: 'relative', zIndex: 1 }}>
        <span className="card-title">🧠 Deep Learning Scoreline Matrix</span>
        <span className="stat-badge badge-teal">CONFIDENCE: {(confidence * 100).toFixed(1)}%</span>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', gap: '2px', marginBottom: '2px' }}>
          <div style={{ width: '42px', minWidth: '42px' }}></div>
          {Array.from({ length: maxGoals + 1 }, (_, j) => (
            <div key={j} style={{ flex: 1, textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '4px 0' }}>{j}</div>
          ))}
        </div>
        {matrix.map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: '2px', marginBottom: '2px' }}>
            <div style={{ width: '42px', minWidth: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{i}</div>
            {row.map((intensity, j) => (
              <div key={j} style={{
                flex: 1, background: getColor(intensity),
                fontSize: '0.6rem', fontFamily: 'var(--font-mono)',
                color: intensity > 0.3 ? '#000' : 'var(--text-muted)',
                padding: '6px 2px', borderRadius: '2px', textAlign: 'center',
                boxShadow: intensity > 0.8 ? '0 0 10px rgba(0, 255, 204, 0.5)' : 'none',
                transition: 'all 0.5s ease'
              }}>
                {(intensity * 100).toFixed(1)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
