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

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useDashboardStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/', active: location.pathname === '/' },
    { icon: History, label: 'History', path: '/history', active: location.pathname === '/history' },
    { icon: Users, label: 'Users', path: '/users', active: location.pathname === '/users', adminOnly: true },
    { icon: Truck, label: 'Drivers', path: '/drivers', active: location.pathname === '/drivers' || location.pathname.startsWith('/drivers/') },
    { icon: Building2, label: 'Clients', path: '/clients', active: location.pathname === '/clients' || location.pathname.startsWith('/clients/') },
    { icon: Warehouse, label: 'Inventory', path: '/inventory', active: location.pathname === '/inventory' },
    { icon: Scissors, label: 'Offcut Usage', path: '/offcut-usage', active: location.pathname === '/offcut-usage' },
    { icon: BarChart3, label: 'Steel Analytics', path: '/steel-analytics', active: location.pathname === '/steel-analytics' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className={`fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out z-50 ${
      sidebarCollapsed ? 'w-16' : 'w-64'
    }`}>
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
              } ${sidebarCollapsed ? 'px-3 justify-center' : 'px-4'}`}
            >
              {/* Maroon accent indicator for active item */}
              {item.active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
              )}
              <item.icon size={20} className={item.active ? 'text-primary' : ''} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Button>
          );
        })}
      </nav>
    </div>
  );
}
