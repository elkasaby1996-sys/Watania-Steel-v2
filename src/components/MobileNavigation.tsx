import { NavLink } from 'react-router-dom';
import { Home, History, BarChart3, Menu } from 'lucide-react';
import { ROUTES } from '@/routes/routes';

export function MobileNavigation({ menuOpen, onMenuClick }: { menuOpen: boolean; onMenuClick: () => void }) {
  return <nav className="mobile-bottom-nav" aria-label="Quick navigation">
    <NavLink to={ROUTES.dashboard} end><Home size={20} /><span>Home</span></NavLink>
    <NavLink to={ROUTES.history}><History size={20} /><span>History</span></NavLink>
    <NavLink to={ROUTES.steelAnalytics}><BarChart3 size={20} /><span>Analytics</span></NavLink>
    <button type="button" onClick={onMenuClick} aria-expanded={menuOpen} aria-controls="mobile-workspace-menu"><Menu size={20} /><span>More</span></button>
  </nav>;
}
