import { Button } from '@/components/ui/button';
import {
  Home,
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
import { useEffect, useMemo, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useDashboardStore } from '../stores/dashboardStore';
import { useAuthStore } from '../stores/authStore';
import { getRoleDisplayName, hasPermission } from '../lib/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '@/routes/routes';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isMobile?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ isMobile = false, mobileOpen = false, onMobileClose }: SidebarProps) {
  const { sidebarCollapsed, setSidebarCollapsed } = useDashboardStore();
  const { user, refreshProfile, signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const dateTime = useMemo(() => ({
    day: now.toLocaleDateString('en-US', { weekday: 'long' }),
    date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  }), [now]);

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: ROUTES.dashboard, active: location.pathname === ROUTES.dashboard, group: 'Daily Work' },
    { icon: History, label: 'History', path: ROUTES.history, active: location.pathname === ROUTES.history, group: 'Daily Work' },
    { icon: Truck, label: 'Drivers', path: ROUTES.drivers, active: location.pathname === ROUTES.drivers || location.pathname.startsWith(`${ROUTES.drivers}/`), group: 'Daily Work' },
    { icon: Building2, label: 'Clients', path: ROUTES.clients, active: location.pathname === ROUTES.clients || location.pathname.startsWith(`${ROUTES.clients}/`), group: 'Daily Work' },
    { icon: Warehouse, label: 'Inventory', path: ROUTES.inventory, active: location.pathname === ROUTES.inventory, group: 'Daily Work' },
    { icon: Scissors, label: 'Offcut Usage', path: ROUTES.offcutUsage, active: location.pathname === ROUTES.offcutUsage, group: 'Insights' },
    { icon: BarChart3, label: 'Steel Analytics', path: ROUTES.steelAnalytics, active: location.pathname === ROUTES.steelAnalytics, group: 'Insights' },
    { icon: Users, label: 'Users', path: ROUTES.users, active: location.pathname === ROUTES.users, adminOnly: true, group: 'Admin' },
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
        className={`app-sidebar fixed left-0 top-0 z-50 flex h-full flex-col border-r transition-all duration-300 ease-in-out ${
          isMobile
            ? `w-72 max-w-[calc(100vw-1rem)] rounded-r-xl ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
            : sidebarCollapsed
            ? 'w-16'
            : 'w-64'
        }`}
      >
      <div className={`sidebar-control-section flex h-14 shrink-0 items-center border-b ${!isMobile && sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'}`}>
        {(isMobile || !sidebarCollapsed) && (
          <p className="truncate text-[15px] font-semibold leading-5 text-gray-50">
            Al Watania Steel
          </p>
        )}
        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileClose}
            className="h-10 w-10 text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text)]"
          >
            <X size={18} />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-9 w-9 shrink-0 text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text)]"
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="space-y-3 overflow-y-auto px-3 py-3">
        {['Daily Work', 'Insights', 'Admin'].map((group) => {
          const groupItems = menuItems.filter((item) => item.group === group);
          const visibleItems = groupItems.filter((item) => !item.adminOnly || hasPermission(user?.profile?.role, 'delete'));

          if (visibleItems.length === 0) {
            return null;
          }

          return (
            <div key={group} className="space-y-1">
              {(isMobile || !sidebarCollapsed) && (
                <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                  {group}
                </div>
              )}
              {visibleItems.map((item, index) => {
          // Hide admin-only items for non-admins
          if (item.adminOnly && !hasPermission(user?.profile?.role, 'delete')) {
            return null;
          }

          return (
            <Button
              key={index}
              variant="ghost"
              onClick={() => handleNavigation(item.path)}
              className={cn(
                'nav-route-button group relative h-9 w-full justify-start gap-2 rounded-md border text-sm',
                item.active
                  ? 'nav-route-button-active border-primary/30 bg-[image:var(--sidebar-active-bg)] shadow-[var(--sidebar-item-shadow)]'
                  : 'border-transparent text-[var(--sidebar-muted)] hover:border-[var(--sidebar-hover-border)] hover:bg-[var(--sidebar-hover-bg)] hover:text-[var(--sidebar-text)]',
                !isMobile && sidebarCollapsed ? 'justify-center px-0' : 'px-2'
              )}
            >
              {item.active && (
                <span
                  key={`active-wash-${location.pathname}`}
                  className="nav-route-wash"
                  aria-hidden="true"
                />
              )}
              <item.icon
                size={17}
                className={cn(
                  'nav-route-icon relative z-10',
                  item.active ? 'text-primary' : 'text-[var(--sidebar-muted)] group-hover:text-[var(--sidebar-text)]'
                )}
              />
              {(isMobile || !sidebarCollapsed) && (
                <span className="relative z-10 flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="truncate font-medium">{item.label}</span>
                  {item.active && (
                    <span
                      key={`active-dot-${location.pathname}`}
                      className="nav-route-dot"
                      aria-hidden="true"
                    />
                  )}
                </span>
              )}
            </Button>
          );
              })}
            </div>
          );
        })}
      </nav>

      <div className={`mt-auto shrink-0 border-t border-[var(--sidebar-border-soft)] px-3 py-3 ${!isMobile && sidebarCollapsed ? 'space-y-2' : 'space-y-3'}`}>
        {(isMobile || !sidebarCollapsed) && (
          <div className="sidebar-bottom-panel rounded-lg border px-3 py-2">
            <p className="text-xs font-semibold text-gray-100">{dateTime.day}</p>
            <p className="mt-0.5 text-[11px] text-[var(--sidebar-muted)]">{dateTime.date}</p>
            <p className="mt-1 font-mono text-sm font-semibold text-primary">{dateTime.time}</p>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'w-full hover:text-[var(--sidebar-text)]',
                !isMobile && sidebarCollapsed
                  ? 'h-10 justify-center rounded-md border-0 bg-transparent px-0 hover:bg-[var(--sidebar-hover-bg)]'
                  : 'sidebar-bottom-panel h-auto justify-start border px-3 py-2'
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-medium">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {(isMobile || !sidebarCollapsed) && (
                <span className="ml-3 min-w-0 text-left">
                  <span className="block truncate text-xs font-semibold text-gray-100">
                    {user?.email || 'User'}
                  </span>
                  <span className="block truncate text-[11px] text-[var(--sidebar-muted)]">
                    {user?.profile?.role ? getRoleDisplayName(user.profile.role) : 'Account'}
                  </span>
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="right" className="w-56">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-popover-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">
                {user?.profile?.role && getRoleDisplayName(user.profile.role)}
              </p>
            </div>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem onClick={refreshProfile} className="text-popover-foreground cursor-pointer">
              Refresh Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-popover-foreground cursor-pointer">
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </div>
    </>
  );
}
