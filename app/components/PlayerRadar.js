'use client';

import { Radar } from 'react-chartjs-2';
import { useEffect, useState } from 'react';
import { fetchSquadTactics } from '../../lib/sofifa-api';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function PlayerRadar({ homeTeam, awayTeam }) {
  const [tactics, setTactics] = useState(null);

  useEffect(() => {
    async function getTactics() {
      const homeT = await fetchSquadTactics(homeTeam);
      const awayT = await fetchSquadTactics(awayTeam);
      
      if (homeT && awayT) {
        setTactics({ home: homeT.tactics, away: awayT.tactics });
      }
    }
    if (homeTeam && awayTeam) {
      getTactics();
    }
  }, [homeTeam, awayTeam]);

  if (!tactics) {
    return <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading SoFIFA Database...</div>;
  }

  const data = {
    labels: ['Attack', 'Midfield', 'Defense', 'Physicality', 'Pressing'],
    datasets: [
      {
        label: homeTeam,
        data: [tactics.home.attack, tactics.home.midfield, tactics.home.defense, tactics.home.physicality, tactics.home.pressing],
        backgroundColor: 'rgba(0, 255, 204, 0.2)',
        borderColor: 'rgba(0, 255, 204, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(0, 255, 204, 1)',
      },
      {
        label: awayTeam,
        data: [tactics.away.attack, tactics.away.midfield, tactics.away.defense, tactics.away.physicality, tactics.away.pressing],
        backgroundColor: 'rgba(255, 51, 102, 0.2)',
        borderColor: 'rgba(255, 51, 102, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(255, 51, 102, 1)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        pointLabels: { color: 'var(--text-secondary)', font: { size: 10, family: 'Courier New' } },
        ticks: { display: false, min: 0, max: 100 }
      },
    },
    plugins: {
      legend: {
        labels: { color: '#fff', font: { family: 'Courier New', weight: 'bold' } }
      }
    }
  };

  return (
    <div className="card animate-in" style={{ padding: '20px', height: '350px' }}>
      <div className="card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
        <span className="card-title">📡 Tactical Matchup Matrix</span>
        <span className="stat-badge badge-blue">SoFIFA VISION</span>
      </div>
      <div style={{ height: '250px', position: 'relative' }}>
        <Radar data={data} options={options} />
      </div>
    </div>
  );
}
