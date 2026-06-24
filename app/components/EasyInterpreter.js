'use client';

export default function EasyInterpreter({ match, sgpLegs, parlayEV }) {
  // Generate single bet advice
  let singleAdvice = "";
  if (match.envDetails.includes('EV on')) {
    const edgeMatch = match.envDetails.match(/([0-9.]+)% EV on (.+) ML/);
    if (edgeMatch) {
      singleAdvice = `I recommend betting on **${edgeMatch[2]} to win**. The traditional bookmaker is undervaluing them, giving you a massive ${edgeMatch[1]}% edge over the market.`;
    } else {
      singleAdvice = `The math suggests betting on **${match.home}**.`;
    }
  } else {
    // Basic fallback based on model vs book diff
    const homeDiff = match.model1X2.home - match.book1X2.home;
    const awayDiff = match.model1X2.away - match.book1X2.away;
    if (homeDiff > 0.05) {
      singleAdvice = `I recommend betting on **${match.home} to win**. The bookmakers give them a ${(match.book1X2.home * 100).toFixed(0)}% chance, but our AI calculates it's actually ${(match.model1X2.home * 100).toFixed(0)}%.`;
    } else if (awayDiff > 0.05) {
      singleAdvice = `I recommend betting on **${match.away} to win**. The bookmakers give them a ${(match.book1X2.away * 100).toFixed(0)}% chance, but our AI calculates it's actually ${(match.model1X2.away * 100).toFixed(0)}%.`;
    } else {
      singleAdvice = `There are no huge single-bet edges on the Moneyline here. Consider looking at Over/Under goals instead.`;
    }
  }

  // Generate multi bet (parlay) advice
  let multiAdvice = "";
  if (sgpLegs.length === 0) {
    multiAdvice = `Select some bets below to see how to string them together into a profitable Same-Game Parlay (SGP).`;
  } else if (sgpLegs.length === 1) {
    multiAdvice = `You've selected **${sgpLegs[0].label}**. Add at least one more bet to create a parlay. Try adding an Over/Under goals bet.`;
  } else if (sgpLegs.length >= 2) {
    if (parlayEV > 0) {
      multiAdvice = `**Great combination!** By grouping these ${sgpLegs.length} bets together, you are exploiting a mathematical edge of +${(parlayEV * 100).toFixed(1)}%. I recommend taking this parlay with a small, disciplined stake.`;
    } else {
      multiAdvice = `**Careful.** This parlay has a negative Expected Value (${(parlayEV * 100).toFixed(1)}%). This means the bookmaker has priced these events tightly. Consider swapping out a bet with worse odds for one with better true probability.`;
    }
  }

  return (
    <div className="card" style={{ marginBottom: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--accent-blue)' }}>
      <div className="card-header" style={{ borderBottom: '1px solid rgba(0,212,255,0.2)' }}>
        <span className="card-title" style={{ color: 'var(--accent-blue)' }}>
          🤖 AI Betting Assistant
        </span>
      </div>
      <div style={{ padding: '16px', fontSize: '0.9rem', lineHeight: '1.6' }}>
        <p style={{ marginBottom: '12px' }}>
          <strong>Single Bet Suggestion:</strong> <span dangerouslySetInnerHTML={{ __html: singleAdvice.replace(/\*\*(.*?)\*\*/g, '<span style="color:var(--text-primary);font-weight:700;">$1</span>') }} />
        </p>
        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '12px 0' }} />
        <p>
          <strong>Multi-Bet (Parlay) Advice:</strong> <span dangerouslySetInnerHTML={{ __html: multiAdvice.replace(/\*\*(.*?)\*\*/g, '<span style="color:var(--text-primary);font-weight:700;">$1</span>') }} />
        </p>
      </div>
    </div>
  );
}
