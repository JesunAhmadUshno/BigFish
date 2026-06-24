import './globals.css'

export const metadata = {
  title: 'BigFish — Premium FIFA World Cup 2026 AI Predictor',
  description: 'Autonomous sports betting predictive AI connected to live markets.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav style={{
          background: 'rgba(7, 11, 20, 0.9)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '16px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* The Logo */}
            <img src="/assets/bigfish_logo.png" alt="BigFish Logo" style={{ height: '48px', width: 'auto', borderRadius: '8px' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '1px' }}>
              Big<span style={{ color: 'var(--accent-teal)' }}>Fish</span>
            </span>
          </div>
          <div className="nav-links" style={{ display: 'flex', gap: '20px', fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '1px' }}>
            <a href="/matches" style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>WORLD CUP HUB</a>
            <a href="/predictions" style={{ color: 'var(--accent-teal)', textDecoration: 'none' }}>LIVE MARKETS</a>
            <a href="/agents" style={{ color: 'var(--accent-purple)', textDecoration: 'none' }}>AI AGENTS</a>
          </div>
        </nav>
        
        {/* The Hero Banner */}
        <div className="hero-banner">
          <div className="hero-content">
            <h1 className="hero-title">FIFA World Cup 2026</h1>
            <div className="hero-subtitle">Autonomous Betting Predictive AI</div>
          </div>
        </div>

        <main className="container">
          {children}
        </main>
      </body>
    </html>
  )
}
