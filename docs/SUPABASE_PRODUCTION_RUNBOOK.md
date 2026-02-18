# Supabase Production Runbook

## Goal
Apply one final hardening migration and verify the RPC contract used by the app.

## Apply migration
Run `supabase/migrations/20260218_production_hardening.sql` in Supabase SQL Editor.

## What this migration fixes
- Adds high-impact indexes for client/site analytics queries.
- Normalizes `get_client_sites_performance(uuid)` to return all client sites (including 0-order sites).
- Adds missing `merge_clients(uuid, uuid, text)` RPC used by frontend.
- Grants execute permissions for authenticated users.

## Post-migration checks
Run these SQL checks:

```sql
select public.get_client_sites_performance('<client-uuid>');
```

```sql
select proname
from pg_proc
where proname in (
  'get_clients_summary',
  'get_client_summary',
  'get_client_orders_page',
  'get_client_sites_performance',
  'get_client_site_summary',
  'get_client_site_orders_page',
  'get_client_analytics',
  'update_client',
  'update_site',
  'merge_clients',
  'merge_client_sites'
)
order by proname;
```

```sql
select indexname, tablename
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'idx_orders_client_id_date',
    'idx_history_orders_client_id_date',
    'idx_orders_site_id_date',
    'idx_history_orders_site_id_date',
    'idx_client_sites_client_id_name'
  )
order by indexname;
```

## Rollback guidance
- Function changes are reversible by re-running the previous migration SQL definitions.
- Indexes can be removed with `drop index if exists <index_name>;`.
