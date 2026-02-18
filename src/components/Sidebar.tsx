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
  Scissors
} from 'lucide-react';
import { useDashboardStore } from '../stores/dashboardStore';
import { useAuthStore } from '../stores/authStore';
import { hasPermission } from '../lib/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '@/routes/routes';
import { useIsMobile } from '@/hooks/use-mobile';

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useDashboardStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

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
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  };

  return (
    <>
      {isMobile && !sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/55 z-40"
          onClick={() => setSidebarCollapsed(true)}
          aria-hidden="true"
        />
      )}
      <div
        className={`fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out z-50 ${
          isMobile
            ? `w-64 max-w-[85vw] ${sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'}`
            : sidebarCollapsed
              ? 'w-16'
              : 'w-64'
        }`}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border">
          <div className="flex items-center justify-center">
            <img
              src="https://c.animaapp.com/mfuv9ro3jvVXIT/img/chatgpt-image-sep-25-2025-10_05_13-am.png"
              alt="Al Watania Steel Qatar"
              className="w-12 h-12 object-contain"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-hover hover:text-gray-100 h-8 w-8"
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>
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
                    ? 'bg-sidebar-active text-gray-50 font-medium'
                    : 'text-sidebar-foreground hover:text-gray-100 hover:bg-sidebar-hover'
                } ${sidebarCollapsed && !isMobile ? 'px-3 justify-center' : 'px-4'}`}
              >
                {/* Maroon accent indicator for active item */}
                {item.active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                )}
                <item.icon size={20} className={item.active ? 'text-primary' : ''} />
                {(!sidebarCollapsed || isMobile) && <span>{item.label}</span>}
              </Button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
