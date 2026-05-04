# Supabase CI/CD Design

## Goal

Automatically apply new Supabase SQL migrations to the production Supabase project when changes are pushed to `main`, while preventing legacy migration files from being replayed before migration history is reconciled.

## Architecture

Netlify remains responsible for building and hosting the frontend from GitHub. GitHub Actions remains responsible for validation and database deployment. The existing CI workflow runs the app checks first; a new dependent job runs Supabase migration deployment only after those checks pass.

## Migration Flow

On pushes to `main`, the workflow checks whether files under `supabase/` changed. If no Supabase files changed, the database deploy job exits successfully without doing anything. If Supabase files changed, the workflow installs the Supabase CLI, initializes missing local Supabase config, links to the production Supabase project using GitHub secrets, runs a dry run, and then applies migrations with `supabase db push`.

## Legacy Migration Safety

The workflow requires a repository secret named `SUPABASE_MIGRATIONS_BOOTSTRAPPED` with the exact value `true` before it applies migrations. This prevents old migration files from being run against production until the production `supabase_migrations.schema_migrations` table has been reconciled.

Before setting that secret, run a dry run against production and repair migration history for any legacy migrations that already exist in the production schema. After repair, set `SUPABASE_MIGRATIONS_BOOTSTRAPPED=true`; future migrations will apply automatically.

## Required GitHub Secrets

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_MIGRATIONS_BOOTSTRAPPED`

## Error Handling

If secrets are missing, the Supabase job fails before applying migrations. If legacy bootstrap is not confirmed, the Supabase job fails with a clear message. If the dry run fails, the real migration push is not attempted. If the real push fails, GitHub Actions shows the Supabase CLI output for diagnosis.

## Testing

Validation is done by checking workflow syntax and running the existing app checks locally with `npm run check`. The actual production migration push should be tested first with `workflow_dispatch` after secrets are configured and legacy migration history is repaired.
