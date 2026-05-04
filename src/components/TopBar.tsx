import { User, LogOut, Shield, RefreshCw, Menu, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useDashboardStore } from '../stores/dashboardStore';
import { useAuthStore } from '../stores/authStore';
import { getRoleDisplayName } from '../lib/auth';

interface TopBarProps {
  isMobile?: boolean;
  onMenuClick?: () => void;
}

export function TopBar({ isMobile = false, onMenuClick }: TopBarProps) {
  const { sidebarCollapsed } = useDashboardStore();
  const { user, signOut, refreshProfile } = useAuthStore();
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    document.documentElement.classList.contains('light') ? 'light' : 'dark'
  );

  const handleSignOut = async () => {
    await signOut();
  };

  const handleRefreshProfile = async () => {
    await refreshProfile();
  };

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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`${isMobile ? 'h-11 w-11 p-0' : 'p-2'} text-foreground hover:bg-white/[0.07] hover:text-accent-foreground`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase() || <User size={16} />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-gray-100">{user?.email}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.profile?.role && getRoleDisplayName(user.profile.role)}
                </p>
              </div>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={handleRefreshProfile}
                className="text-popover-foreground cursor-pointer"
              >
                Refresh Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-popover-foreground cursor-pointer">
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
              >
                <LogOut size={16} className="mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
