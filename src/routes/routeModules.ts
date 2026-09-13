import { matchPath } from 'react-router-dom';
import { ROUTES } from './routes';

// Navigation and React.lazy share imports, so intent preloads are reused.
export const routeModules = {
  [ROUTES.dashboard]: () => import('../pages/Dashboard').then(m => ({ default: m.Dashboard })),
  [ROUTES.history]: () => import('../pages/History').then(m => ({ default: m.History })),
  [ROUTES.users]: () => import('../pages/Users').then(m => ({ default: m.Users })),
  [ROUTES.drivers]: () => import('../pages/Drivers').then(m => ({ default: m.Drivers })),
  [ROUTES.driverDetail]: () => import('../pages/DriverDetail').then(m => ({ default: m.DriverDetail })),
  [ROUTES.clients]: () => import('../pages/Clients').then(m => ({ default: m.Clients })),
  [ROUTES.clientProfile]: () => import('../pages/ClientProfile').then(m => ({ default: m.ClientProfilePage })),
  [ROUTES.clientSite]: () => import('../pages/ClientSiteDetails').then(m => ({ default: m.ClientSiteDetailsPage })),
  [ROUTES.inventory]: () => import('../pages/Inventory').then(m => ({ default: m.Inventory })),
  [ROUTES.offcutUsage]: () => import('../pages/OffcutUsage').then(m => ({ default: m.OffcutUsage })),
  [ROUTES.steelAnalytics]: () => import('../pages/SteelAnalytics').then(m => ({ default: m.SteelAnalytics })),
  [ROUTES.offcutExecutiveReport]: () => import('../reports/offcut/OffcutExecutivePrintPage').then(m => ({ default: m.OffcutExecutivePrintPage })),
};

export async function preloadRoute(pathname: string) {
  const entry = Object.entries(routeModules).find(([path]) => matchPath(path, pathname));
  // Preloading is optional. A failed preload must not break navigation.
  try { await entry?.[1](); } catch { /* The actual route load reports failures. */ }
}
