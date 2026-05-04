import { Button } from '@/components/ui/button';
import {
  Home,
  Package,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  History,
  Truck,
  Building2,
  Warehouse,
  Scissors,
  X
} from 'lucide-react';
import { useDashboardStore } from '../stores/dashboardStore';
import { useAuthStore } from '../stores/authStore';
import { hasPermission } from '../lib/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '@/routes/routes';

interface SidebarProps {
  isMobile?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ isMobile = false, mobileOpen = false, onMobileClose }: SidebarProps) {
  const { sidebarCollapsed, setSidebarCollapsed } = useDashboardStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: ROUTES.dashboard, active: location.pathname === ROUTES.dashboard },
    { icon: History, label: 'History', path: ROUTES.history, active: location.pathname === ROUTES.history },
    { icon: Users, label: 'Users', path: ROUTES.users, active: location.pathname === ROUTES.users, adminOnly: true },
    { icon: Truck, label: 'Drivers', path: ROUTES.drivers, active: location.pathname === ROUTES.drivers || location.pathname.startsWith(`${ROUTES.drivers}/`) },
    { icon: Building2, label: 'Clients', path: ROUTES.clients, active: location.pathname === ROUTES.clients || location.pathname.startsWith(`${ROUTES.clients}/`) },
    { icon: Warehouse, label: 'Inventory', path: ROUTES.inventory, active: location.pathname === ROUTES.inventory },
    { icon: Scissors, label: 'Offcut Usage', path: ROUTES.offcutUsage, active: location.pathname === ROUTES.offcutUsage },
    { icon: BarChart3, label: 'Steel Analytics', path: ROUTES.steelAnalytics, active: location.pathname === ROUTES.steelAnalytics },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {isMobile && mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onMobileClose}
          aria-label="Close menu overlay"
        />
      )}
      <div
        className={`fixed left-0 top-0 h-full border-r border-white/[0.12] bg-[var(--glass-panel-strong)] shadow-glass backdrop-blur-2xl transition-all duration-300 ease-in-out z-50 ${
          isMobile
            ? `w-72 max-w-[calc(100vw-1rem)] rounded-r-2xl ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
            : sidebarCollapsed
            ? 'w-16'
            : 'w-64'
        }`}
      >
      {/* Logo Section */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-white/[0.12]">
        <div className="flex items-center justify-center">
          <img
            src="https://c.animaapp.com/mfuv9ro3jvVXIT/img/chatgpt-image-sep-25-2025-10_05_13-am.png"
            alt="Al Watania Steel Qatar"
            className="w-12 h-12 object-contain"
          />
        </div>
        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileClose}
            className="text-sidebar-foreground hover:bg-white/[0.07] hover:text-gray-100 h-11 w-11"
          >
            <X size={18} />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-sidebar-foreground hover:bg-white/[0.07] hover:text-gray-100 h-8 w-8"
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {menuItems.map((item, index) => {
          // Hide admin-only items for non-admins
          if (item.adminOnly && !hasPermission(user?.profile?.role, 'delete')) {
            return null;
          }

          return (
            <Button
              key={index}
              variant="ghost"
              onClick={() => handleNavigation(item.path)}
              className={`w-full justify-start gap-3 h-11 transition-all duration-200 relative ${
                item.active
                  ? 'bg-white/[0.08] text-gray-50 font-medium border border-white/[0.18] shadow-[inset_0_1px_rgba(255,255,255,0.08)]'
                  : 'text-sidebar-foreground hover:text-gray-100 hover:bg-white/[0.06]'
              } ${!isMobile && sidebarCollapsed ? 'px-3 justify-center' : 'px-4'}`}
            >
              {/* Maroon accent indicator for active item */}
              {item.active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
              )}
              <item.icon size={20} className={item.active ? 'text-primary' : ''} />
              {(isMobile || !sidebarCollapsed) && <span>{item.label}</span>}
            </Button>
          );
        })}
      </nav>
      </div>
    </>
  );
}
