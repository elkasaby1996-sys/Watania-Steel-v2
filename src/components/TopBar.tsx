import { Shield, RefreshCw, Menu, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDashboardStore } from '../stores/dashboardStore';
import { useAuthStore } from '../stores/authStore';
import { getRoleDisplayName } from '../lib/auth';

interface TopBarProps {
  isMobile?: boolean;
  onMenuClick?: () => void;
}

export function TopBar({ isMobile = false, onMenuClick }: TopBarProps) {
  const { sidebarCollapsed } = useDashboardStore();
  const { user } = useAuthStore();
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    document.documentElement.classList.contains('light') ? 'light' : 'dark'
  );

  const handleAppRefresh = () => {
    window.location.reload();
  };

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'editor':
        return 'success';
      case 'viewer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <header className={`fixed top-0 right-0 z-40 h-16 border-b border-white/[0.12] bg-[var(--glass-panel)] shadow-glass backdrop-blur-2xl transition-all duration-300 ease-in-out ${
      isMobile ? 'left-0' : sidebarCollapsed ? 'left-16' : 'left-64'
    }`}>
      <div className={`flex h-full items-center justify-between ${isMobile ? 'px-3 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]' : 'px-6'}`}>
        <div className="flex min-w-0 flex-1 items-center">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="mr-2 h-11 w-11 text-foreground hover:bg-white/[0.07] hover:text-accent-foreground"
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </Button>
          )}
          <h1 className={`min-w-0 truncate font-headline font-bold text-foreground ${isMobile ? 'text-base' : 'text-xl'}`}>
            {isMobile ? 'Watania ERP' : 'Factory Management System'}
          </h1>
        </div>

        <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-4'}`}>
          <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
            {!isMobile && user?.profile?.role && (
              <Badge variant={getRoleBadgeVariant(user.profile.role) as any}>
                <Shield size={12} className="mr-1" />
                {getRoleDisplayName(user.profile.role)}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className={`${isMobile ? 'h-11 w-11' : 'h-8 w-8'} text-foreground hover:bg-white/[0.07] hover:text-accent-foreground`}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAppRefresh}
              className={`${isMobile ? 'h-11 w-11' : 'h-8 w-8'} text-foreground hover:bg-white/[0.07] hover:text-accent-foreground`}
              aria-label="Refresh app"
              title="Refresh app"
            >
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
