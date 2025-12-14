import { User, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useDashboardStore } from '../stores/dashboardStore';
import { useAuthStore } from '../stores/authStore';
import { getRoleDisplayName } from '../lib/auth';

export function TopBar() {
  const { sidebarCollapsed } = useDashboardStore();
  const { user, signOut, refreshProfile } = useAuthStore();


  const handleSignOut = async () => {
    await signOut();
  };

  const handleRefreshProfile = async () => {
    await refreshProfile();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'editor':
        return 'bg-green-100 text-green-800';
      case 'viewer':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <header className={`fixed top-0 right-0 h-16 bg-card border-b border-border z-40 transition-all duration-300 ease-in-out ${
      sidebarCollapsed ? 'left-16' : 'left-64'
    }`}>
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex-1 flex items-center">
          <h1 className="font-headline font-bold text-xl text-foreground">Order Management System</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {user?.profile?.role && (
              <Badge className={getRoleDisplayName(user.profile.role)}>
                <Shield size={12} className="mr-1" />
                {getRoleDisplayName(user.profile.role)}
              </Badge>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground p-2"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {user?.email?.charAt(0).toUpperCase() || <User size={16} />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover text-popover-foreground w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.profile?.role && getRoleDisplayName(user.profile.role)}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleRefreshProfile}
                className="text-popover-foreground hover:bg-accent hover:text-accent-foreground"
              >
                Refresh Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-popover-foreground hover:bg-accent hover:text-accent-foreground">
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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
