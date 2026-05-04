# Supabase CI/CD

This project deploys the frontend through Netlify from GitHub. Supabase database changes are deployed through GitHub Actions from files in `supabase/migrations`.

## GitHub Secrets

Create these secrets in GitHub under repository settings:

- `SUPABASE_ACCESS_TOKEN`: A Supabase personal access token.
- `SUPABASE_PROJECT_ID`: The production Supabase project ref.
- `SUPABASE_DB_PASSWORD`: The production database password.
- `SUPABASE_MIGRATIONS_BOOTSTRAPPED`: Set to `true` only after legacy migration history has been reconciled.

The workflow will not apply migrations until `SUPABASE_MIGRATIONS_BOOTSTRAPPED` is exactly `true`.

## First-Time Legacy Migration Bootstrap

This repository already contains historical migration files. If the production database was built manually or through the Supabase dashboard, those migrations may already be reflected in the schema but not recorded in `supabase_migrations.schema_migrations`.

Before enabling automatic production deployment:

1. Install and authenticate the Supabase CLI locally.
2. Link the project:

   ```bash
   supabase link --project-ref <project-ref>
   ```

3. Preview what Supabase would apply:

   ```bash
   supabase db push --dry-run
   ```

4. If the dry run lists legacy migrations that are already present in production, mark those migrations as applied with Supabase migration repair.

   ```bash
   supabase migration repair --status applied <migration-version>
   ```

   Use the migration version from the filename prefix, for example `20260218` or `20260503124413`, depending on the exact file being repaired.

5. Repeat the dry run until it only lists migrations that should really be applied.
6. In GitHub secrets, set `SUPABASE_MIGRATIONS_BOOTSTRAPPED` to `true`.

## Everyday Flow

1. Add a new SQL file under `supabase/migrations`.
2. Commit and push to `main`.
3. GitHub Actions runs the app checks.
4. If checks pass and Supabase files changed, GitHub Actions runs a Supabase dry run.
5. If the dry run succeeds, GitHub Actions applies migrations with `supabase db push`.
6. Netlify deploys the frontend from GitHub as usual.

## Manual Deployment Test

The CI workflow supports `workflow_dispatch`, so you can run it manually from the GitHub Actions tab after configuring secrets. Manual runs force the Supabase deploy job to check migrations even if the latest commit did not change `supabase/`.

## Failure Notes

- If a secret is missing, the deploy job fails before linking to Supabase.
- If `SUPABASE_MIGRATIONS_BOOTSTRAPPED` is not `true`, the deploy job fails before any migration command runs.
- If the dry run fails, migrations are not applied.
- If `supabase db push` fails, inspect the GitHub Actions log and fix the SQL migration in a new commit.
