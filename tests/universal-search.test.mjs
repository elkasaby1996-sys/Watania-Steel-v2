import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

// Exercise real PostgREST requests, with an isolated transport and no live data.
const requests = [];
let failures = new Set();
const rows = {
  orders: [{ id: 'order-old', delivery_number: 'DN-123', company: 'Acme', site: 'North', date: '2020-01-01', status: 'pending' }],
  history_orders: [{ id: 'archive-1', delivery_number: 'DN-124', customer_name: 'Acme', date: '2019-01-01', status: 'delivered' }],
  clients: [{ id: 'client-1', name: 'Acme' }],
  client_sites: [{ id: 'site-1', client_id: 'client-1', name: 'North', location_text: 'Doha' }],
  drivers: [{ id: 'driver-1', name: 'Ahmed', phone_number: '12345678' }],
};
globalThis.__searchClient = createClient('https://search.example.invalid', 'test-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: async (input, init) => {
    const url = new URL(String(input));
    requests.push({ url, signal: init?.signal });
    const table = url.pathname.split('/').at(-1);
    assert.ok(table in rows, `Unexpected endpoint ${table}`);
    if (failures.has(table)) return new Response(JSON.stringify({ message: 'Unavailable', code: '42501' }), { status: 403 });
    const data = url.searchParams.has('id') ? { ...rows[table][0], tons: 12, breakdown_8mm: 4 } : rows[table];
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
  } },
});
const output = resolve(`.codex-search-tests-${process.pid}.mjs`);
const bundle = await build({
  entryPoints: ['src/lib/universalSearch.ts'], bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'isolated-search', setup(builder) {
    builder.onResolve({ filter: /\/supabase$/ }, () => ({ path: 'backend', namespace: 'search-test' }));
    builder.onLoad({ filter: /.*/, namespace: 'search-test' }, () => ({ contents: 'export const supabase = globalThis.__searchClient;' }));
  } }],
});
await writeFile(output, bundle.outputFiles[0].text);
try {
  const { searchRecords, searchPages, searchFilter, normalizeSearch, fetchSearchOrder } = await import(pathToFileURL(output));
  await test('empty, short and cancelled searches do not issue database requests', async () => {
    for (const value of ['', ' ', 'a', '***']) {
      assert.deepEqual(await searchRecords(value, new AbortController().signal), { results: [], failedGroups: [] });
    }
    const controller = new AbortController(); controller.abort();
    await searchRecords('Acme', controller.signal);
    assert.equal(requests.length, 0);
  });
  await test('queries every record type with bounded results and no date restriction', async () => {
    const signal = new AbortController().signal;
    const result = await searchRecords('Acme', signal);
    assert.equal(result.results.length, 5);
    assert.deepEqual(result.failedGroups, []);
    for (const request of requests) {
      assert.equal(request.url.searchParams.get('limit'), '6');
      assert.equal(request.url.searchParams.has('date'), false);
      assert.ok(request.signal);
      assert.notEqual(request.url.searchParams.get('select'), '*');
    }
    assert.deepEqual(result.results[0].order, { table: 'orders', id: 'order-old' });
    assert.deepEqual(result.results[1].order, { table: 'history_orders', id: 'archive-1' });
    assert.equal(result.results[2].path, '/clients/client-1');
    assert.equal(result.results[3].path, '/clients/client-1/sites/site-1');
    assert.equal(result.results[4].path, '/drivers/driver-1');
  });
  await test('partial failures retain successful groups and identify unavailable sources', async () => {
    failures = new Set(['history_orders', 'drivers']);
    const result = await searchRecords('Acme', new AbortController().signal);
    assert.deepEqual(result.failedGroups, ['History', 'Drivers']);
    assert.deepEqual(result.results.map(row => row.group), ['Orders', 'Clients', 'Sites']);
    failures = new Set();
  });
  await test('special characters stay inside a quoted literal and LIKE wildcards are escaped', () => {
    const input = 'شركة "A,B" (50%_x)\\branch';
    const filter = searchFilter(['name'], input);
    const literal = JSON.parse(filter.slice('name.ilike.'.length));
    assert.equal(literal, '%شركة "A,B" (50\\%\\_x)\\\\branch%');
    assert.equal(normalizeSearch('*Acme*'), 'Acme');
    assert.equal(normalizeSearch('a'.repeat(120)).length, 100);
  });
  await test('page shortcuts support aliases and hide administration for non-admin roles', () => {
    assert.equal(searchPages('stock', 'viewer')[0].path, '/inventory');
    assert.equal(searchPages('admin', 'viewer').length, 0);
    assert.equal(searchPages('admin', undefined).length, 0);
    assert.equal(searchPages('users', 'admin')[0].path, '/users');
  });
  await test('opening an order reads full details from its original source', async () => {
    const order = await fetchSearchOrder({ table: 'history_orders', id: 'archive-1' }, new AbortController().signal);
    assert.equal(order.id, 'archive-1');
    assert.equal(order.breakdown_8mm, 4);
    assert.equal(requests.at(-1).url.searchParams.get('id'), 'eq.archive-1');
    assert.equal(requests.at(-1).url.searchParams.get('select'), '*');
  });
} finally {
  await unlink(output);
  delete globalThis.__searchClient;
}
