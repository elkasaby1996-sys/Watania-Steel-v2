export const ROUTES = {
  dashboard: '/',
  history: '/history',
  users: '/users',
  drivers: '/drivers',
  driverDetail: '/drivers/:driverId',
  clients: '/clients',
  clientProfile: '/clients/:clientId',
  clientSite: '/clients/:clientId/sites/:siteId',
  inventory: '/inventory',
  offcutUsage: '/offcut-usage',
  steelAnalytics: '/steel-analytics',
  offcutExecutiveReport: '/reports/offcut/executive'
} as const;

export const routeTo = {
  driverDetail: (driverId: string) => `${ROUTES.drivers}/${driverId}`,
  clientProfile: (clientId: string) => `${ROUTES.clients}/${clientId}`,
  clientSite: (clientId: string, siteId: string) => `${ROUTES.clients}/${clientId}/sites/${siteId}`
};
