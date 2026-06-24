'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SidebarNav() {
  const pathname = usePathname();

  const navItems = [
    { section: 'Command Center' },
    { href: '/', id: 'nav-dashboard', icon: '📊', label: 'Dashboard' },
    { href: '/matches', id: 'nav-matches', icon: '⚽', label: 'Live Matches' },
    { section: 'AI Engine' },
    { href: '/predictions', id: 'nav-predictions', icon: '🧠', label: 'Predictions & SGP' },
    { href: '/analytics', id: 'nav-analytics', icon: '📈', label: 'Analytics' },
    { section: 'Capital' },
    { href: '/bankroll', id: 'nav-bankroll', icon: '💰', label: 'Bankroll Manager' },
  ];

  return (
    <nav className="sidebar-nav">
      {navItems.map((item, index) => {
        if (item.section) {
          return (
            <div key={index} className="nav-section-label">
              {item.section}
            </div>
          );
        }

        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.id}
            href={item.href}
            id={item.id}
            className={`nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
