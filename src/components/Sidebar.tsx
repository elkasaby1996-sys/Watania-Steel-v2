import { Button } from '@/components/ui/button';
import { 
  Home, 
  Package, 
  Users, 
  BarChart3, 
  ChevronLeft,
  ChevronRight,
  History,
  Truck
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
    { icon: BarChart3, label: 'Steel Analytics', path: '/steel-analytics', active: location.pathname === '/steel-analytics' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className={`fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 ease-in-out z-50 ${
      sidebarCollapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="flex items-center justify-between px-6 h-16 border-b border-border">
        <div className="flex items-center justify-center">
          <img 
            src="https://c.animaapp.com/mfuv9ro3jvVXIT/img/chatgpt-image-sep-25-2025-10_05_13-am.png" 
            alt="Al Watania Steel Qatar"
            className="w-14 h-14 object-contain"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>
      
      <nav className="p-4 space-y-2">
        {menuItems.map((item, index) => {
          // Hide admin-only items for non-admins
          if (item.adminOnly && !hasPermission(user?.profile?.role, 'delete')) {
            return null;
          }
          
          return (
            <Button
              key={index}
              variant={item.active ? "default" : "ghost"}
              onClick={() => handleNavigation(item.path)}
              className={`w-full justify-start gap-3 h-11 transition-all duration-200 ${
                item.active 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              } ${sidebarCollapsed ? 'px-3' : 'px-4'}`}
            >
              <item.icon size={20} />
              {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
            </Button>
          );
        })}
      </nav>
    </div>
  );
}
