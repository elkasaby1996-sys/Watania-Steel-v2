// Isolated reproduction against the installed SDK. All HTTP responses are mocked;
// this script does not load .env or contact the application's database.
// Run from the project root: node docs/performance-auth-repro.mjs
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const fakeUser = {
  id: 'audit-user', aud: 'authenticated', role: 'authenticated',
  email: 'audit@example.invalid', created_at: new Date().toISOString(),
};
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const accessToken = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: fakeUser.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.audit-signature`;
const session = {
  access_token: accessToken, refresh_token: 'audit-refresh',
  expires_in: 3600, token_type: 'bearer', user: fakeUser,
};

async function run(defer) {
  let profileRequests = 0;
  let refreshHandlerEntered = false;
  let refreshHandlerCompleted = false;
  const client = createClient('https://audit.example.invalid', 'audit-anon-key', {
    auth: {
      persistSession: false, autoRefreshToken: false,
      detectSessionInUrl: false, storageKey: `audit-${defer}`,
    },
    global: {
      fetch: async input => {
        const url = String(input);
        const respond = data => new Response(JSON.stringify(data), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
        if (url.includes('/auth/v1/token')) return respond(session);
        if (url.includes('/profiles')) {
          profileRequests++;
          return respond({ id: fakeUser.id, role: 'viewer' });
        }
        throw new Error('Unexpected mock endpoint');
      },
    },
  });

  await client.auth.signInWithPassword({ email: fakeUser.email, password: 'audit-only' });
  const work = async event => {
    if (event === 'TOKEN_REFRESHED') refreshHandlerEntered = true;
    await pause(300); // Same awaited delay as src/lib/auth.ts.
    await client.from('profiles').select('*').eq('id', fakeUser.id).single();
    if (event === 'TOKEN_REFRESHED') refreshHandlerCompleted = true;
  };
  const { data: { subscription } } = client.auth.onAuthStateChange(
    defer
      ? (event, currentSession) => {
          if (currentSession) setTimeout(() => { void work(event); }, 0);
        }
      : async (event, currentSession) => {
          if (currentSession) await work(event);
        },
  );

  await pause(450); // Allow INITIAL_SESSION work to finish.
  profileRequests = 0;
  let refreshResolved = false;
  void client.auth.refreshSession().then(() => { refreshResolved = true; });
  await pause(900);
  let unrelatedQueryResolved = false;
  void client.from('profiles').select('*').eq('id', fakeUser.id).single()
    .then(() => { unrelatedQueryResolved = true; });
  await pause(400);
  subscription.unsubscribe();
  return {
    mode: defer ? 'deferred callback control' : 'current awaited callback pattern',
    refreshHandlerEntered, refreshHandlerCompleted, refreshResolved,
    unrelatedQueryResolved, profileRequests,
  };
}

const current = await run(false);
const control = await run(true);
console.log(JSON.stringify({ current, control }, null, 2));
assert.equal(current.refreshHandlerEntered, true);
assert.equal(current.refreshResolved, false);
assert.equal(current.unrelatedQueryResolved, false);
assert.equal(current.profileRequests, 0);
assert.equal(control.refreshHandlerCompleted, true);
assert.equal(control.refreshResolved, true);
assert.equal(control.unrelatedQueryResolved, true);
assert.equal(control.profileRequests, 2);
console.log('Confirmed: the awaited callback stalls; the deferred control completes.');
process.exit(0); // Deliberately stalled promises cannot be cleaned up through that client.
