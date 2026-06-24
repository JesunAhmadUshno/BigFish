import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: '#fff', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '2px' }}>
        Welcome to the <span style={{ color: 'var(--accent-teal)' }}>Future of Betting</span>
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 40px', lineHeight: 1.8 }}>
        BigFish uses advanced autonomous AI agents, physiometric analysis, and the Dixon-Coles model to generate <strong>true probabilities</strong> for the 2026 FIFA World Cup and live global markets.
      </p>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <Link href="/predictions" className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem', textDecoration: 'none' }}>
          ENTER LIVE DASHBOARD
        </Link>
      </div>

      <div className="grid grid-3" style={{ marginTop: '80px', textAlign: 'left' }}>
        <div className="card">
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🌍</div>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-teal)', marginBottom: '12px' }}>Global API Connected</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Fully autonomous live data feeds pulling directly from The Odds API and official FIFA World Cup servers in real-time.</p>
        </div>
        <div className="card">
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🤖</div>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-teal)', marginBottom: '12px' }}>AI Sentiment Agents</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>NLP agents continuously scan news feeds for injury reports, altitude advantages, and team momentum to adjust the mathematical expected goals.</p>
        </div>
        <div className="card">
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>💰</div>
          <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--accent-teal)', marginBottom: '12px' }}>Smart Execution</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Fractional Kelly Criterion bankroll management instantly calculates your optimal stake to maximize ROI while protecting your capital.</p>
        </div>
      </div>
    </div>
  );
}
