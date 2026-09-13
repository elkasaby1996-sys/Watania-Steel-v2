import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

// Bundle the actual application modules against an isolated backend. No .env,
// browser credentials, live requests, or additional test dependencies are used.
globalThis.__performanceBackend = {};
const output = resolve(`.codex-performance-tests-${process.pid}.mjs`);
const bundle = await build({
  stdin: {
    contents: `export { authService } from './src/lib/auth';
      export { useAuthStore } from './src/stores/authStore';
      export { useDashboardStore } from './src/stores/dashboardStore';
      export { useDriversStore } from './src/stores/driversStore';
      export { useInventoryStore } from './src/stores/inventoryStore';
      export { cachedRead, invalidateQueries, resetQuerySession, peekQuery } from './src/lib/queryCache';
      export { fetchClientSummary, fetchClientOrdersPage, updateClient } from './src/lib/clientsApi';
      export { fetchAnalyticsSummary, fetchMaxDateAcrossTables, invalidateAnalyticsCache } from './src/lib/steelAnalytics';
      export { orderService as actualOrderService, historyService as actualHistoryService,
        driverService as actualDriverService, inventoryService as actualInventoryService,
        offcutUsageService as actualOffcutService, supabase as isolatedClient } from './src/lib/supabase.ts';`,
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false,
  define: { 'import.meta.env': JSON.stringify({ DEV: false,
    VITE_SUPABASE_URL: 'https://service-test.example.invalid', VITE_SUPABASE_ANON_KEY: 'test-key' }) },
  plugins: [{ name: 'isolated-backend', setup(builder) {
    builder.onResolve({ filter: /(?:^|\/)supabase$/ }, () => ({ path: 'backend', namespace: 'audit' }));
    builder.onLoad({ filter: /.*/, namespace: 'audit' }, () => ({ contents: `
      const proxy = key => new Proxy({}, { get: (_, name) => {
        const target = globalThis.__performanceBackend[key];
        const value = target?.[name];
        return typeof value === 'function' ? value.bind(target) : value;
      }});
      export const supabase = proxy('supabase');
      export const orderService = proxy('orders');
      export const historyService = proxy('history');
      export const activityService = proxy('activities');
      export const driverService = proxy('drivers');
      export const inventoryService = proxy('inventory');
      export const ensureOrderClientSite = async () => ({clientId:null, siteId:null});
      export const verifyHistoryOrderClientLink = async () => {};
    ` }));
  } }],
});
await writeFile(output, bundle.outputFiles[0].text);
const { authService, useAuthStore, useDashboardStore, actualOrderService, isolatedClient,
  fetchAnalyticsSummary, fetchMaxDateAcrossTables, invalidateAnalyticsCache,
  useDriversStore, useInventoryStore, cachedRead, invalidateQueries, resetQuerySession, peekQuery,
  fetchClientSummary, fetchClientOrdersPage, updateClient, actualHistoryService, actualDriverService,
  actualInventoryService, actualOffcutService } = await import(pathToFileURL(output).href);
const backend = globalThis.__performanceBackend;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
async function within(promise, ms = 1500) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Operation did not complete')), ms);
    })]);
  } finally { clearTimeout(timer); }
}
async function until(predicate) {
  await within((async () => { while (!predicate()) await pause(5); })());
}

try {
  await test('real SDK token refresh and later queries complete through the app auth listener', async () => {
    const user = { id: 'audit-user', email: 'audit@example.invalid', aud: 'authenticated', created_at: new Date().toISOString() };
    const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${b64({ alg: 'HS256' })}.${b64({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.test`;
    const session = { access_token: token, refresh_token: 'test', token_type: 'bearer', expires_in: 3600, user };
    const client = createClient('https://audit.example.invalid', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: async input => {
        const path = new URL(String(input)).pathname;
        const data = path === '/auth/v1/token' ? session : path === '/rest/v1/profiles' ? { id: user.id, role: 'viewer' } : null;
        assert.notEqual(data, null, `Unexpected mock endpoint: ${path}`);
        return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
      } },
    });
    backend.supabase = client;
    await client.auth.signInWithPassword({ email: user.email, password: 'test' });
    const observed = [];
    const { data: { subscription } } = authService.onAuthStateChange(value => observed.push(value));
    try {
      await until(() => observed.some(value => value?.profile));
      await within(client.auth.refreshSession());
      const result = await within(client.from('profiles').select('*').single());
      assert.equal(result.error, null);
      assert.equal(result.data.role, 'viewer');
    } finally { subscription.unsubscribe(); }
  });

  await test('late profile results cannot restore a signed-out user or overwrite another account', async () => {
    let listener;
    const requests = new Map();
    backend.supabase = {
      auth: { onAuthStateChange: callback => { listener = callback; return { data: { subscription: { unsubscribe() {} } } }; } },
      from: () => ({ select() { return this; }, eq(_, id) { this.id = id; return this; }, single() {
        const request = deferred(); requests.set(this.id, request); return request.promise;
      } }),
    };
    const observed = [];
    const { data: { subscription } } = authService.onAuthStateChange(value => observed.push(value));
    const emit = id => listener('SIGNED_IN', { user: { id, email: `${id}@example.invalid` } });
    assert.equal(emit('first'), undefined, 'SDK callback must return synchronously');
    await until(() => requests.has('first'));
    listener('SIGNED_OUT', null);
    requests.get('first').resolve({ data: { id: 'first', role: 'admin' }, error: null });
    await pause(10);
    assert.equal(observed.at(-1), null);
    emit('second');
    await until(() => requests.has('second'));
    emit('third');
    await until(() => requests.has('third'));
    requests.get('third').resolve({ data: { id: 'third', role: 'viewer' }, error: null });
    await until(() => observed.at(-1)?.profile?.id === 'third');
    requests.get('second').resolve({ data: { id: 'second', role: 'admin' }, error: null });
    await pause(10);
    assert.equal(observed.at(-1).id, 'third');
    emit('fourth');
    await until(() => requests.has('fourth'));
    subscription.unsubscribe();
    const count = observed.length;
    requests.get('fourth').resolve({ data: { id: 'fourth' }, error: null });
    await pause(10);
    assert.equal(observed.length, count);
  });

  await test('simultaneous profile readers share one lookup', async () => {
    let calls = 0;
    const response = deferred();
    backend.supabase = { from: () => ({ select() { return this; }, eq() { return this; }, single() { calls++; return response.promise; } }) };
    const first = authService.getUserProfile('shared');
    const second = authService.getUserProfile('shared');
    response.resolve({ data: { id: 'shared', role: 'viewer' }, error: null });
    assert.deepEqual(await first, await second);
    assert.equal(calls, 1);
  });

  const today = new Date().toISOString().slice(0, 10);
  const row = (id, overrides = {}) => ({ id, customer_name: id, date: today,
    status: 'in-progress', tons: 10, shift: 'morning', order_type: 'cut-and-bend',
    breakdown_12mm: 10, ...overrides });
  const rows = [row('cut'), row('straight', { tons: 5, order_type: 'straight-bar', status: 'completed' }),
    row('delayed', { tons: 3, status: 'delayed', breakdown_12mm: 3 }),
    row('future', { date: '2999-01-01' }), row('already-in-history')];
  let reads = 0, idReads = 0, historyReads = 0;
  backend.orders = { getActive: async () => { reads++; return rows; } };
  backend.history = { getDeliveredOrderIds: async () => { idReads++; return new Set(['already-in-history']); },
    getAll: async () => { historyReads++; return []; } };
  backend.activities = { create: async () => ({}), getRecent: async () => [] };

  await test('orders and metrics share one fetch, preserve carryover/future semantics and skip full history', async () => {
    useDashboardStore.getState().resetSessionData();
    await Promise.all([useDashboardStore.getState().loadOrders(), useDashboardStore.getState().loadDashboardMetrics()]);
    const state = useDashboardStore.getState();
    assert.equal(reads, 1); assert.equal(idReads, 1); assert.equal(historyReads, 0);
    assert.equal(state.orders.length, 4);
    assert.equal(state.getTodayOrders().length, 3);
    assert.equal(state.dashboardMetrics.totalTons, 18);
    assert.equal(state.dashboardMetrics.cutAndBendTons, 13);
    assert.equal(state.dashboardMetrics.straightBarTons, 5);
    assert.equal(state.dashboardMetrics.steelMix['12mm'], 13);
    await state.loadOrders({ force: false });
    assert.equal(reads, 1, 'Fresh route revisits must not refetch');
  });

  await test('background refresh retains visible data and reports failure without emptying it', async () => {
    const response = deferred();
    backend.orders.getActive = () => response.promise;
    const previous = useDashboardStore.getState().orders;
    const request = useDashboardStore.getState().loadOrders();
    assert.equal(useDashboardStore.getState().isRefreshingOrders, true);
    assert.equal(useDashboardStore.getState().isLoadingOrders, false);
    assert.equal(useDashboardStore.getState().isLoadingMetrics, false);
    response.reject(new Error('Test network failure'));
    await request;
    assert.equal(useDashboardStore.getState().orders, previous);
    assert.equal(useDashboardStore.getState().refreshError, 'Test network failure');
    assert.equal(useDashboardStore.getState().isRefreshingOrders, false);
  });

  await test('identity changes invalidate pending dashboard reads; profile updates do not', async () => {
    useAuthStore.setState({ user: { id: 'old', profile: null } });
    const response = deferred();
    backend.orders.getActive = () => response.promise;
    const request = useDashboardStore.getState().loadOrders();
    useAuthStore.setState({ user: { id: 'new', profile: null } });
    response.resolve(rows);
    await request;
    assert.equal(useDashboardStore.getState().orders.length, 0);
    backend.orders.getActive = async () => rows;
    await useDashboardStore.getState().loadOrders();
    const previous = useDashboardStore.getState().orders;
    useAuthStore.setState({ user: { id: 'new', profile: { role: 'viewer' } } });
    assert.equal(useDashboardStore.getState().orders, previous);
    useAuthStore.setState({ user: null });
    assert.equal(useDashboardStore.getState().orders.length, 0);
  });

  await test('local creates and deletes update totals and invalidate older refreshes', async () => {
    backend.orders.getActive = async () => rows;
    await useDashboardStore.getState().loadOrders();
    const stale = deferred();
    backend.orders.getActive = () => stale.promise;
    const pending = useDashboardStore.getState().loadOrders();
    backend.orders.create = async order => order;
    await useDashboardStore.getState().addOrder({ id: 'new-order', customerName: 'New order', date: today,
      tons: 2, status: 'in-progress', shift: 'morning', orderType: 'straight-bar' });
    assert.equal(useDashboardStore.getState().dashboardMetrics.totalTons, 20);
    stale.resolve(rows);
    await pending;
    assert.equal(useDashboardStore.getState().dashboardMetrics.totalTons, 20);
    backend.orders.delete = async () => {};
    await useDashboardStore.getState().deleteOrder('new-order');
    assert.equal(useDashboardStore.getState().dashboardMetrics.totalTons, 18);
  });

  await test('explicit history loads coalesce and cannot repopulate a cleared session', async () => {
    const response = deferred();
    let calls = 0;
    backend.history.getAll = () => { calls++; return response.promise; };
    const first = useDashboardStore.getState().loadHistoryOrders();
    const second = useDashboardStore.getState().loadHistoryOrders();
    assert.equal(first, second);
    useDashboardStore.getState().resetSessionData();
    response.resolve([{ id: 'previous-account-history' }]);
    await first;
    assert.equal(calls, 1);
    assert.equal(useDashboardStore.getState().historyOrders.length, 0);
  });

  await test('initialization coalesces and late startup/profile responses cannot undo sign-out', async () => {
    const original = { getCurrentUser: authService.getCurrentUser, onAuthStateChange: authService.onAuthStateChange,
      refreshUserProfile: authService.refreshUserProfile, signOut: authService.signOut };
    const startup = deferred(), profile = deferred(), logout = deferred();
    let listener, subscriptions = 0;
    authService.getCurrentUser = () => startup.promise;
    authService.onAuthStateChange = callback => {
      listener = callback; subscriptions++;
      return { data: { subscription: { unsubscribe() {} } } };
    };
    authService.refreshUserProfile = () => profile.promise;
    authService.signOut = () => logout.promise;
    try {
      useAuthStore.setState({ initialized: false, user: null });
      const first = useAuthStore.getState().initialize();
      assert.equal(useAuthStore.getState().initialize(), first);
      assert.equal(subscriptions, 1);
      listener({ id: 'current-user', email: 'current@example.invalid', profile: null });
      startup.resolve({ id: 'stale-user', profile: { role: 'admin' } });
      await first;
      assert.equal(useAuthStore.getState().user.id, 'current-user');
      const refreshing = useAuthStore.getState().refreshProfile();
      const signingOut = useAuthStore.getState().signOut();
      listener({ id: 'current-user', profile: { role: 'admin' } });
      assert.equal(useAuthStore.getState().loading, true);
      logout.resolve({ error: null });
      await signingOut;
      profile.resolve({ id: 'current-user', role: 'admin' });
      await refreshing;
      assert.equal(useAuthStore.getState().user, null);
      assert.equal(useAuthStore.getState().loading, false);
    } finally { Object.assign(authService, original); }
  });

  await test('active query paginates beyond the API row cap and duplicate checks target both tables', async () => {
    const originalFetch = globalThis.fetch;
    const requests = [];
    let fail = false;
    globalThis.fetch = async input => {
      const url = new URL(String(input));
      assert.equal(url.hostname, 'service-test.example.invalid');
      requests.push(url);
      if (fail) return new Response(JSON.stringify({ message: 'Database unavailable' }), { status: 503 });
      const targeted = url.searchParams.get('id');
      const offset = Number(url.searchParams.get('offset') || 0);
      const data = targeted
        ? (url.pathname.endsWith('/history_orders') ? [{ id: 'duplicate' }] : [])
        : Array.from({ length: offset === 0 ? 1000 : 2 }, (_, i) => row(String(offset + i)));
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
    };
    try {
      const result = await actualOrderService.getActive();
      assert.equal(result.length, 1002);
      assert.equal(requests.length, 2);
      assert.ok(requests.every(url => url.searchParams.get('status') === 'neq.delivered'));
      assert.equal(requests[1].searchParams.get('offset'), '1000');
      requests.length = 0;
      assert.equal(await actualOrderService.deliveryNumberExists('duplicate'), true);
      assert.deepEqual(requests.map(url => url.pathname).sort(), ['/rest/v1/history_orders', '/rest/v1/orders']);
      assert.ok(requests.every(url => url.searchParams.get('id') === 'eq.duplicate' && url.searchParams.get('select') === 'id'));
      fail = true;
      await assert.rejects(actualOrderService.deliveryNumberExists('new-id'));
    } finally { globalThis.fetch = originalFetch; }
  });
  await test('analytics bounds payloads, preserves dates and archive precedence, and shares reads', async () => {
    const originalFetch = globalThis.fetch;
    backend.supabase = isolatedClient;
    const delivered = (id, date, extra = {}) => ({ id, date, status: 'delivered', delivered_at: null,
      tons: 1, order_type: 'Straight Bar', breakdown_8mm: 0.25, ...extra });
    const tables = {
      history_orders: [
        ...Array.from({ length: 1500 }, (_, i) => delivered(`old-${i}`, '2020-01-01')),
        ...Array.from({ length: 1002 }, (_, i) => delivered(`recent-${i}`, '2026-09-10')),
        delivered('shadow', '2020-01-01'),
        delivered('null-history', null),
        delivered('type-shadow', '2026-09-09', { order_type: 'Cut & Bend', tons: 3 }),
      ],
      orders: [
        delivered('recent-0', '2026-09-10', { tons: 900 }),
        delivered('shadow', '2026-09-10', { delivered_at: '2099-01-01T12:00:00+00:00', tons: 900 }),
        delivered('type-shadow', '2026-09-10', { tons: 900 }),
        delivered('fallback', '2026-09-11', { order_type: 'cutbend', tons: 2 }),
        delivered('timestamp', '2020-01-01', { delivered_at: '2026-09-12T23:59:59+00:00', tons: 4 }),
        delivered('null-history', '2026-09-10', { tons: 5 }),
        delivered('tomorrow', '2026-09-10', { delivered_at: '2026-09-13T00:00:00+00:00', tons: 6 }),
      ],
    };
    const requests = [];
    let fail = false;
    let gate = null;
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.hostname, 'service-test.example.invalid');
      requests.push(url);
      if (gate) await gate.promise;
      if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (fail) return new Response(JSON.stringify({ message: 'Analytics unavailable' }), { status: 503 });
      const table = url.pathname.split('/').at(-1);
      let rows = [...tables[table]];
      for (const [column, filter] of url.searchParams) {
        if (['select', 'order', 'offset', 'limit'].includes(column)) continue;
        if (filter === 'not.is.null') rows = rows.filter(row => row[column] != null);
        else if (filter === 'is.null') rows = rows.filter(row => row[column] == null);
        else if (filter.startsWith('in.')) {
          const ids = filter.slice(4, -1).split(',').map(id => id.replaceAll('"', ''));
          rows = rows.filter(row => ids.includes(row[column]));
        } else {
          const dot = filter.indexOf('.');
          const op = filter.slice(0, dot);
          const value = filter.slice(dot + 1);
          rows = rows.filter(row => {
            if (row[column] == null) return false;
            const actual = column === 'delivered_at' ? Date.parse(row[column]) : row[column];
            const expected = column === 'delivered_at' ? Date.parse(value) : value;
            if (op === 'eq') return actual === expected;
            if (op === 'gt') return actual > expected;
            if (op === 'gte') return actual >= expected;
            if (op === 'lt') return actual < expected;
            if (op === 'lte') return actual <= expected;
            throw new Error(`Unexpected filter: ${filter}`);
          });
        }
      }
      const ordering = (url.searchParams.get('order') || '').split(',').filter(Boolean);
      rows.sort((a, b) => {
        for (const order of ordering) {
          const [key, direction] = order.split('.');
          const cmp = String(a[key]).localeCompare(String(b[key]));
          if (cmp) return direction === 'desc' ? -cmp : cmp;
        }
        return 0;
      });
      const offset = Number(url.searchParams.get('offset') || 0);
      rows = rows.slice(offset, offset + Number(url.searchParams.get('limit') || 1000));
      const columns = url.searchParams.get('select').split(',').map(value => value.trim());
      return new Response(JSON.stringify(rows.map(row => Object.fromEntries(columns.map(key => [key, row[key]])))),
        { headers: { 'Content-Type': 'application/json' } });
    };
    const range = { startDate: '2026-09-01', endDate: '2026-09-12', mode: 'all' };
    try {
      invalidateAnalyticsCache();
      const [one, two] = await Promise.all([fetchAnalyticsSummary(range), fetchAnalyticsSummary(range)]);
      assert.equal(one, two, 'Concurrent callers share the same summary');
      assert.equal(one.totalTons, 1016);
      assert.equal(one.rowsAnalyzed, 1006);
      assert.equal(one.timeSeries.at(-1).tons, 4, 'Last-day timestamps are included');
      assert.equal(one.timeSeries.length, 12);
      const fullReads = requests.filter(url => url.searchParams.get('select').includes('tons'));
      assert.equal(fullReads.length, 4, 'Two history pages and two date-bounded order sources');
      assert.ok(fullReads.every(url => [...url.searchParams.values()].some(value => value.startsWith('gte.2026-09-01'))));
      const count = requests.length;
      const cut = await fetchAnalyticsSummary({ ...range, mode: 'cut-and-bend' });
      assert.equal(cut.totalTons, 5, 'Legacy spellings and history type take precedence');
      assert.equal(requests.length, count, 'Type changes reuse the date-bounded rows');
      await fetchAnalyticsSummary(range);
      assert.equal(requests.length, count, 'Fresh summary revisits make no requests');

      assert.equal(await fetchMaxDateAcrossTables(), '2026-09-13', 'Shadowed 2099 active date is ignored');
      assert.equal(await fetchMaxDateAcrossTables('cut-and-bend'), '2026-09-11');
      assert.ok(requests.slice(count).every(url => !url.searchParams.get('select').includes('tons')),
        'Latest-date discovery downloads metadata only');

      invalidateAnalyticsCache();
      requests.length = 0;
      gate = deferred();
      const controller = new AbortController();
      const cancelled = fetchAnalyticsSummary({ ...range, signal: controller.signal });
      const rejected = assert.rejects(cancelled, { name: 'AbortError' });
      await until(() => requests.length === 3);
      controller.abort();
      const survivor = fetchAnalyticsSummary(range);
      gate.resolve(); gate = null;
      await rejected;
      assert.equal((await survivor).totalTons, 1016, 'Cancelling one caller does not abort its replacement');
      assert.equal(requests.filter(url => url.searchParams.get('select').includes('tons')).length, 4);

      invalidateAnalyticsCache();
      fail = true;
      await assert.rejects(fetchAnalyticsSummary(range), /Analytics unavailable/);
      fail = false;
      assert.equal((await fetchAnalyticsSummary(range)).totalTons, 1016, 'Failed loads can retry');
      useDashboardStore.getState().resetSessionData();
      const beforeResetRead = requests.length;
      await fetchAnalyticsSummary(range);
      assert.ok(requests.length > beforeResetRead, 'Session reset clears cached analytics');

      invalidateAnalyticsCache();
      gate = deferred();
      const beforeStaleRead = requests.length;
      const stale = fetchAnalyticsSummary(range);
      const staleRejected = assert.rejects(stale, /[Aa]bort/);
      await until(() => requests.length === beforeStaleRead + 3);
      invalidateAnalyticsCache();
      gate.resolve(); gate = null;
      await staleRejected;
      assert.equal((await fetchAnalyticsSummary(range)).totalTons, 1016, 'Invalidated work cannot repopulate the cache');
    } finally {
      gate?.resolve();
      invalidateAnalyticsCache();
      globalThis.fetch = originalFetch;
    }
  });
  await test('History requests only its page, reuses fresh results, and surfaces refresh failures', async () => {
    const originalFetch = globalThis.fetch;
    invalidateQueries();
    const requests = [];
    let fail = false;
    globalThis.fetch = async input => {
      const url = new URL(String(input));
      assert.equal(url.hostname, 'service-test.example.invalid');
      requests.push(url);
      if (fail) return new Response(JSON.stringify({ message: 'History unavailable' }), { status: 503 });
      const offset = Number(url.searchParams.get('offset') || 0);
      const size = Number(url.searchParams.get('limit'));
      assert.equal(size, 50);
      return new Response(JSON.stringify(Array.from({ length: size }, (_, i) => row(String(offset + i)))),
        { headers: { 'Content-Type': 'application/json', 'Content-Range': `${offset}-${offset + size - 1}/5242` } });
    };
    try {
      const params = { page: 1, pageSize: 50, filters: { company: 'Steel', dateFrom: '2026-09-01', dateTo: '2026-09-12' } };
      const [one, two] = await Promise.all([actualHistoryService.getPaginated(params), actualHistoryService.getPaginated(params)]);
      assert.equal(one, two); assert.equal(one.count, 5242); assert.equal(one.data.length, 50);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].searchParams.get('company'), 'ilike.%Steel%');
      assert.equal(requests[0].searchParams.get('order'), 'delivered_at.desc,id.asc');
      assert.ok(requests[0].searchParams.get('delivered_at'));
      const second = await actualHistoryService.getPaginated({ ...params, page: 2 });
      assert.equal(second.pageStart, 51); assert.equal(second.data[0].id, '50');
      await actualHistoryService.getPaginated(params);
      assert.equal(requests.length, 2, 'Returning to page one uses its cached results');
      fail = true;
      await assert.rejects(actualHistoryService.getPaginated({ ...params, force: true }), /History unavailable/);
      assert.equal((await actualHistoryService.getPaginated(params)).data.length, 50, 'Failed refresh keeps last successful cache');
      fail = false;
      invalidateQueries('history:');
      await actualHistoryService.getPaginated(params);
      assert.equal(requests.length, 4, 'Invalidation fetches a new page');
    } finally { invalidateQueries(); globalThis.fetch = originalFetch; }
  });

  await test('driver metrics use shared cycle queries and detail history is paginated', async () => {
    const originalFetch = globalThis.fetch;
    invalidateQueries();
    const requests = [];
    const drivers = Array.from({ length: 20 }, (_, i) => ({ id: `driver-${i}`, name: `Driver ${i}`, phone_number: '0', is_active: true }));
    globalThis.fetch = async input => {
      const url = new URL(String(input));
      assert.equal(url.hostname, 'service-test.example.invalid'); requests.push(url);
      const table = url.pathname.split('/').at(-1);
      let data;
      let total = 0;
      if (table === 'drivers') data = drivers;
      else if (url.searchParams.has('driver_name')) {
        const offset = Number(url.searchParams.get('offset') || 0);
        const limit = Number(url.searchParams.get('limit'));
        assert.ok(limit <= 100, 'Initial detail pages must not download the complete driver archive');
        const source = table === 'orders' ? 'a' : 'h';
        data = Array.from({ length: limit }, (_, i) => ({ id: `${source}-${String(offset + i).padStart(4, '0')}`,
          date: '2026-09-01', status: 'delivered', tons: 2 }));
        total = 400;
      } else {
        assert.ok(url.searchParams.get('date').startsWith('gte.'));
        assert.equal(url.searchParams.get('select'), 'id,driver_name,status,tons');
        data = drivers.map((driver, i) => ({ id: `order-${i}`, driver_name: driver.name,
          status: table === 'orders' ? 'in-progress' : 'delivered', tons: table === 'orders' ? 3 : 5 }));
      }
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'Content-Range': `0-${data.length - 1}/${total || data.length}` } });
    };
    try {
      const list = await actualDriverService.getAll();
      const metrics = await actualDriverService.getMetrics(list);
      assert.equal(requests.length, 3, '20 drivers require one list + two data queries, not 42');
      assert.equal(metrics.length, 20);
      assert.equal(metrics[0].total_orders, 2); assert.equal(metrics[0].total_tons, 8);
      assert.equal(metrics[0].completed_orders, 1); assert.equal(metrics[0].pending_orders, 1);
      await actualDriverService.getMetrics(list);
      assert.equal(requests.length, 3);
      const first = await actualDriverService.getDriverOrdersPage('Driver 0');
      const second = await actualDriverService.getDriverOrdersPage('Driver 0', 2);
      assert.equal(first.totalCount, 800); assert.equal(first.data.length, 50); assert.equal(second.data.length, 50);
      assert.ok(!first.data.some(row => second.data.some(other => row.id === other.id)), 'Merged pages have no overlap');
    } finally { invalidateQueries(); globalThis.fetch = originalFetch; }
  });

  await test('inventory loads coalesce, retain data on failure, and cannot cross accounts', async () => {
    resetQuerySession(); useInventoryStore.getState().resetSessionData();
    let calls = 0;
    let fail = false;
    let gate = null;
    backend.inventory = { getTableData: async name => {
      calls++; if (gate) await gate.promise;
      if (fail && name === 'wire') throw new Error('Wire unavailable');
      return [{ id: name, value: fail ? 2 : 1 }];
    } };
    const one = useInventoryStore.getState().loadAllInventory();
    const two = useInventoryStore.getState().loadAllInventory();
    assert.equal(one, two); await one; assert.equal(calls, 6);
    fail = true;
    const refresh = useInventoryStore.getState().loadAllInventory();
    assert.equal(useInventoryStore.getState().loading, false, 'Background refresh keeps tables visible');
    await refresh;
    assert.equal(useInventoryStore.getState().data.wire[0].value, 1, 'Failed table retains its values');
    assert.equal(useInventoryStore.getState().data.coils[0].value, 2, 'Other tables update independently');
    assert.match(useInventoryStore.getState().error, /Wire unavailable/);
    gate = deferred();
    const late = useInventoryStore.getState().loadAllInventory();
    await until(() => calls === 18);
    resetQuerySession(); useInventoryStore.getState().resetSessionData();
    gate.resolve(); await late;
    assert.deepEqual(useInventoryStore.getState().data.wire, []);
    assert.equal(useInventoryStore.getState().hasLoaded, false);
  });

  await test('client RPCs share cancellable reads and successful writes invalidate them', async () => {
    const originalFetch = globalThis.fetch;
    backend.supabase = isolatedClient;
    invalidateQueries();
    const requests = [];
    let gate = null;
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.hostname, 'service-test.example.invalid');
      requests.push({ url, signal: init.signal, body: JSON.parse(init.body) });
      if (gate) await gate.promise;
      if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const data = url.pathname.endsWith('/update_client') ? { client_id: 'c' } : [{ client_id: 'c', total_count: 100 }];
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
    };
    try {
      await Promise.all([fetchClientSummary('c'), fetchClientSummary('c')]);
      assert.equal(requests.length, 1);
      await fetchClientOrdersPage('c', { limit: 50, offset: 50 });
      assert.equal(requests[1].body.limit_count, 50); assert.equal(requests[1].body.offset_count, 50);
      await updateClient('c', {});
      assert.equal(requests[2].signal, undefined, 'Writes are not coupled to read cancellation');
      await fetchClientSummary('c');
      assert.equal(requests.length, 4, 'Successful write invalidates cached summary');
      invalidateQueries();
      gate = deferred();
      const controller = new AbortController();
      const cancelled = fetchClientSummary('c', controller.signal);
      const rejected = assert.rejects(cancelled, { name: 'AbortError' });
      await until(() => requests.length === 5);
      controller.abort(); await rejected;
      await until(() => requests[4].signal.aborted);
      gate.resolve(); gate = null;
    } finally { gate?.resolve(); invalidateQueries(); globalThis.fetch = originalFetch; }
  });

  await test('inventory and offcut service reads reuse fresh data and writes invalidate it', async () => {
    const originalFetch = globalThis.fetch;
    invalidateQueries();
    const requests = [];
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.hostname, 'service-test.example.invalid');
      requests.push(url);
      const table = url.pathname.split('/').at(-1);
      let data;
      if (init.method === 'PATCH' || init.method === 'POST') data = { id: '1' };
      else if (table === 'offcut_usage') {
        assert.equal(url.searchParams.get('date'), 'gte.2026-09-01');
        assert.ok(url.searchParams.getAll('date').includes('lte.2026-09-30'));
        const offset = Number(url.searchParams.get('offset') || 0);
        data = Array.from({ length: offset === 0 ? 1000 : 1 }, (_, i) => ({ id: String(offset + i), date: '2026-09-01' }));
      } else data = [{ id: '1', value: 20 }];
      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
    };
    try {
      await Promise.all([actualInventoryService.getTableData('wire'), actualInventoryService.getTableData('wire')]);
      await actualInventoryService.getTableData('wire');
      assert.equal(requests.length, 1);
      await actualInventoryService.updateRow('wire', '1', { value: 30 });
      await actualInventoryService.getTableData('wire');
      assert.equal(requests.length, 3);
      const month = await actualOffcutService.getByMonth(2026, 9);
      assert.equal(month.length, 1001, 'A selected range is not truncated at the API row cap');
      await actualOffcutService.getByDateRange('2026-09-01', '2026-09-30');
      assert.equal(requests.length, 5);
      await actualOffcutService.create({ date: '2026-09-01', diameter_mm: 8, pieces_used: 1, weight_tons: 1 });
      await actualOffcutService.getByMonth(2026, 9);
      assert.equal(requests.length, 8, 'Successful offcut edit expires cached range data');
    } finally { invalidateQueries(); globalThis.fetch = originalFetch; }
  });

  await test('late driver reads cannot overwrite a successful edit', async () => {
    resetQuerySession(); useDriversStore.getState().resetSessionData();
    const oldRead = deferred();
    const original = { id: 'd', name: 'Old', phone_number: '0', is_active: true };
    useDriversStore.setState({ drivers: [original], hasLoaded: true });
    backend.drivers = {
      getAll: () => oldRead.promise,
      update: async (_, patch) => ({ ...original, ...patch }),
    };
    const load = useDriversStore.getState().loadDrivers();
    await useDriversStore.getState().updateDriver('d', { name: 'Edited' });
    oldRead.resolve([original]); await load;
    assert.equal(useDriversStore.getState().drivers[0].name, 'Edited');
    assert.equal(useDriversStore.getState().error, null);
  });

  await test('shared page cache expires, coalesces forced refreshes, and clears on session reset', async () => {
    invalidateQueries();
    const originalNow = Date.now;
    let now = originalNow(); Date.now = () => now;
    let calls = 0;
    const read = async () => ++calls;
    try {
      assert.equal(await cachedRead('test:page', read), 1);
      assert.equal(await cachedRead('test:page', read), 1);
      now += 30_001;
      assert.equal(peekQuery('test:page'), undefined, 'Expired data is not considered fresh');
      assert.equal(peekQuery('test:page', { allowStale: true }), 1, 'A returning page can show recent data during refresh');
      await cachedRead('test:other-page', async () => 'other');
      assert.equal(peekQuery('test:page', { allowStale: true }), 1, 'Reading another page does not discard retained data');
      assert.equal(await cachedRead('test:page', read), 2);
      const [a, b] = await Promise.all([cachedRead('test:page', read, undefined, { force: true }),
        cachedRead('test:page', read, undefined, { force: true })]);
      assert.equal(a, 3); assert.equal(b, 3);
      resetQuerySession();
      assert.equal(peekQuery('test:page'), undefined);
      assert.equal(peekQuery('test:page', { allowStale: true }), undefined, 'Identity changes also clear retained data');
      assert.equal(await cachedRead('test:page', read), 4);
      now += 330_001;
      assert.equal(peekQuery('test:page', { allowStale: true }), undefined, 'Retention is bounded to five minutes after expiry');
    } finally { Date.now = originalNow; invalidateQueries(); }
  });
} finally {
  await isolatedClient.auth.stopAutoRefresh();
  await unlink(output);
  delete globalThis.__performanceBackend;
}
