import { User, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useDashboardStore } from '../stores/dashboardStore';
import { useAuthStore } from '../stores/authStore';
import { getRoleDisplayName } from '../lib/auth';
import { GlobalSearch } from './GlobalSearch';

export function TopBar() {
  const { sidebarCollapsed } = useDashboardStore();
  const { user, signOut, refreshProfile } = useAuthStore();


  const handleSignOut = async () => {
    await signOut();
  };

  const handleRefreshProfile = async () => {
    await refreshProfile();
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
    <header className={`fixed top-0 right-0 h-16 bg-card border-b border-border z-40 transition-all duration-300 ease-in-out ${
      sidebarCollapsed ? 'left-16' : 'left-64'
    }`}>
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex-1 flex items-center gap-6">
          <h1 className="font-headline font-bold text-xl text-gray-50">Factory Management System</h1>
          <GlobalSearch />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {user?.profile?.role && (
              <Badge variant={getRoleBadgeVariant(user.profile.role) as any}>
                <Shield size={12} className="mr-1" />
                {getRoleDisplayName(user.profile.role)}
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="text-foreground hover:bg-accent hover:text-accent-foreground p-2"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase() || <User size={16} />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover text-popover-foreground w-56 border border-border">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-gray-100">{user?.email}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.profile?.role && getRoleDisplayName(user.profile.role)}
                </p>
              </div>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={handleRefreshProfile}
                className="text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
              >
                Refresh Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer">
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
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
