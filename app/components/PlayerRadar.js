'use client';

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function PlayerRadar({ homeLineup, awayLineup, homeTeam, awayTeam }) {
  // Aggregate mock tactical metrics for the starting lineups
  const homeStats = { attack: 0, defense: 0, possession: 0, pressing: 0, creativity: 0, stamina: 0 };
  const awayStats = { attack: 0, defense: 0, possession: 0, pressing: 0, creativity: 0, stamina: 0 };

  // Generate pseudo-stats based on xG weights for the visualizer
  const agg = (lineup, stats) => {
    lineup.forEach(p => {
      stats.attack += p.xgWeight * 20;
      stats.creativity += p.xgWeight * 15;
      stats.possession += 10;
      stats.defense += (2 - p.xgWeight) * 10;
      stats.pressing += 12;
      stats.stamina += 15;
    });
  };

  agg(homeLineup.slice(0, 11), homeStats);
  agg(awayLineup.slice(0, 11), awayStats);

  // Normalize 0-100
  const norm = (val) => Math.min(100, Math.max(40, val / 11));
  
  const data = {
    labels: ['Attacking', 'Creativity', 'Possession', 'Defensive Solidity', 'Pressing Intensity', 'Physicality'],
    datasets: [
      {
        label: homeTeam,
        data: [norm(homeStats.attack), norm(homeStats.creativity), norm(homeStats.possession), norm(homeStats.defense), norm(homeStats.pressing), norm(homeStats.stamina)],
        backgroundColor: 'rgba(0, 255, 204, 0.2)', // Teal
        borderColor: 'rgba(0, 255, 204, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(0, 255, 204, 1)',
      },
      {
        label: awayTeam,
        data: [norm(awayStats.attack), norm(awayStats.creativity), norm(awayStats.possession), norm(awayStats.defense), norm(awayStats.pressing), norm(awayStats.stamina)],
        backgroundColor: 'rgba(157, 78, 221, 0.2)', // Purple
        borderColor: 'rgba(157, 78, 221, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(157, 78, 221, 1)',
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
        <span className="stat-badge badge-blue">SWARM VISION</span>
      </div>
      <div style={{ height: '250px', position: 'relative' }}>
        <Radar data={data} options={options} />
      </div>
    </div>
  );
}
