'use client';
import { useEffect, useRef } from 'react';

let scriptDebounceTimer = null;

export function ensureWidgetScript() {
  if (typeof document === 'undefined') return;
  
  if (scriptDebounceTimer) clearTimeout(scriptDebounceTimer);
  
  scriptDebounceTimer = setTimeout(() => {
    let script = document.getElementById('api-football-widget-script');
    if (script) {
      script.remove();
    }
    const newScript = document.createElement('script');
    newScript.id = 'api-football-widget-script';
    newScript.type = 'module';
    newScript.src = 'https://widgets.api-sports.io/2.0.3/widget.js';
    document.body.appendChild(newScript);
  }, 100); // Wait 100ms for all React DOM mutations to finish before triggering the script
}

export function MatchStatisticsWidget({ fixtureId, apiKey }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!fixtureId || !apiKey) return;
    ensureWidgetScript();

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      const widgetDiv = document.createElement('div');
      widgetDiv.id = 'wg-api-football-statistics';
      widgetDiv.setAttribute('data-host', 'v3.football.api-sports.io');
      widgetDiv.setAttribute('data-key', apiKey);
      widgetDiv.setAttribute('data-fixture', fixtureId);
      widgetDiv.setAttribute('data-theme', 'dark');
      containerRef.current.appendChild(widgetDiv);
    }
  }, [fixtureId, apiKey]);

  return <div ref={containerRef} style={{ width: '100%', minHeight: '300px', background: '#111', borderRadius: '8px', overflow: 'hidden' }} />;
}

export function MatchLineupWidget({ fixtureId, apiKey }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!fixtureId || !apiKey) return;
    ensureWidgetScript();

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      const widgetDiv = document.createElement('div');
      widgetDiv.id = 'wg-api-football-fixture'; // API-Sports fixture widget includes lineups
      widgetDiv.setAttribute('data-host', 'v3.football.api-sports.io');
      widgetDiv.setAttribute('data-key', apiKey);
      widgetDiv.setAttribute('data-id', fixtureId);
      widgetDiv.setAttribute('data-theme', 'dark');
      widgetDiv.setAttribute('data-show-errors', 'false');
      containerRef.current.appendChild(widgetDiv);
    }
  }, [fixtureId, apiKey]);

  return <div ref={containerRef} style={{ width: '100%', minHeight: '400px', background: '#111', borderRadius: '8px', overflow: 'hidden' }} />;
}

export function StandingsWidget({ leagueId, season, apiKey }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!leagueId || !apiKey) return;
    ensureWidgetScript();

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      const widgetDiv = document.createElement('div');
      widgetDiv.id = 'wg-api-football-standings';
      widgetDiv.setAttribute('data-host', 'v3.football.api-sports.io');
      widgetDiv.setAttribute('data-key', apiKey);
      widgetDiv.setAttribute('data-league', leagueId);
      widgetDiv.setAttribute('data-season', season || new Date().getFullYear());
      widgetDiv.setAttribute('data-theme', 'dark');
      containerRef.current.appendChild(widgetDiv);
    }
  }, [leagueId, season, apiKey]);

  return <div ref={containerRef} style={{ width: '100%', minHeight: '400px', background: '#111', borderRadius: '8px', overflow: 'hidden' }} />;
}
