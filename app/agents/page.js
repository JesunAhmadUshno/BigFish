'use client';

export default function AgentsPage() {
  const agents = [
    {
      id: 'dixon-coles',
      name: 'Dixon-Coles Predictive Engine',
      icon: '🧠',
      status: 'ONLINE',
      color: 'var(--accent-teal)',
      description: 'The core mathematical backbone of BigFish. This agent calculates Expected Goals (xG) by modeling the attack strength and defense vulnerability of every team based on historical Elo ratings. It applies a Poisson distribution to predict exact scorelines, factoring in the low-scoring nature of football (rho/ρ correlation).',
      capabilities: ['xG Modeling', 'Poisson Distribution Matrix', 'Odds Generation'],
    },
    {
      id: 'sentiment-nlp',
      name: 'NLP Sentiment Agent',
      icon: '📰',
      status: 'ONLINE',
      color: 'var(--accent-purple)',
      description: 'An autonomous natural language processing agent that continuously scans for external variables. It analyzes weather (WBGT), extreme altitude changes, team morale, and critical player injuries, adjusting the mathematical xG output with an Environmental Multiplier.',
      capabilities: ['Injury News Parsing', 'Weather/Altitude Adjustment', 'Momentum Tracking'],
    },
    {
      id: 'kelly-risk',
      name: 'Kelly Criterion Risk Manager',
      icon: '💰',
      status: 'ONLINE',
      color: 'var(--accent-gold)',
      description: 'The financial brain of BigFish. It continuously monitors the live bookmaker odds from The Odds API and compares them against the AI\'s true probabilities to find Expected Value (+EV). It then strictly dictates stake sizing using Fractional Kelly formulas to maximize bankroll growth while minimizing the risk of ruin.',
      capabilities: ['Expected Value (+EV) Calculation', 'Fractional Bankroll Sizing', 'Variance Protection'],
    },
    {
      id: 'live-simulator',
      name: 'Live Monte Carlo Simulator',
      icon: '⏱️',
      status: 'ONLINE',
      color: 'var(--accent-red)',
      description: 'Runs real-time simulations during active matches. By consuming live match time and current scores, this agent recalculates the remaining Expected Goals using linear time-decay, updating the win probabilities second-by-second.',
      capabilities: ['Linear Time-Decay Modeling', 'In-Play Live Odds Adjustment', 'Dynamic Goal Probability'],
    }
  ];

  return (
    <>
      <div className="card animate-in" style={{ marginBottom: '32px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(0,255,204,0.1), transparent)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--accent-teal)' }}>🤖 AUTONOMOUS AGENTS</h1>
        <p style={{ color: 'var(--text-secondary)' }}>System Status & Neural Network Overview</p>
      </div>

      <div className="grid grid-2">
        {agents.map((agent, idx) => (
          <div key={agent.id} className="card animate-in" style={{ animationDelay: `${idx * 0.15}s`, borderTop: `3px solid ${agent.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '2.5rem' }}>{agent.icon}</span>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: agent.color }}>{agent.name}</h3>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>ID: {agent.id.toUpperCase()}_SYS</span>
                </div>
              </div>
              <span className="stat-badge badge-green" style={{ animation: 'pulse 2s infinite' }}>{agent.status}</span>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', minHeight: '80px' }}>
              {agent.description}
            </p>

            <div>
              <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Core Capabilities</h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {agent.capabilities.map((cap, i) => (
                  <span key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid var(--border-subtle)' }}>
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 250, 154, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(0, 250, 154, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 250, 154, 0); }
        }
      `}} />
    </>
  );
}
