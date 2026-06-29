'use client';

import { useEffect, useRef } from 'react';
import { ensureWidgetScript } from './ApiWidgets';

export default function RealMatchTracker({ fixtureId, apiKey }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!fixtureId || !apiKey) return;

    // Clean up previous widget
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      
      const widgetDiv = document.createElement('div');
      widgetDiv.id = 'wg-api-football-game';
      widgetDiv.setAttribute('data-host', 'v3.football.api-sports.io');
      widgetDiv.setAttribute('data-key', apiKey);
      widgetDiv.setAttribute('data-id', fixtureId);
      widgetDiv.setAttribute('data-theme', 'dark');
      widgetDiv.setAttribute('data-show-errors', 'false');
      widgetDiv.setAttribute('data-show-logos', 'true');
      
      containerRef.current.appendChild(widgetDiv);
      
      // Use the global debounced script loader
      ensureWidgetScript();
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [fixtureId, apiKey]);

  if (!fixtureId) {
    return (
      <div className="card" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No Live Match Selected
      </div>
    );
  }

  return (
    <div className="card animate-in" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--accent-teal)' }}>
      <div className="card-header" style={{ background: '#000', borderBottom: '1px solid rgba(0,255,204,0.2)' }}>
        <span className="card-title" style={{ color: 'var(--accent-teal)' }}>⚡ REAL-TIME MATCH TRACKER</span>
        <span className="stat-badge badge-green">LIVE DATA</span>
      </div>
      
      {/* The API-Football Widget Container */}
      <div style={{ width: '100%', background: '#111', minHeight: '400px' }} ref={containerRef}>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading Secure Live Feed...
        </div>
      </div>
    </div>
  );
}
