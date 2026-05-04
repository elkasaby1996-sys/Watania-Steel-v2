# Supabase CI/CD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Actions based Supabase migration deployment flow that runs after app CI passes and protects production from replaying legacy migrations.

**Architecture:** Extend the existing CI workflow with a dependent `deploy-supabase` job. The job detects Supabase file changes, gates production deployment behind a bootstrap secret, links the Supabase project from GitHub secrets, performs a dry run, then applies migrations.

**Tech Stack:** GitHub Actions, Supabase CLI via `supabase/setup-cli@v1`, Vite/React existing CI, Supabase migrations.

---

### Task 1: Document the Design

**Files:**

- Create: `docs/superpowers/specs/2026-05-04-supabase-cicd-design.md`
- Create: `docs/superpowers/plans/2026-05-04-supabase-cicd.md`

- [x] **Step 1: Write the design document**

Capture the deployment goal, workflow shape, required secrets, legacy migration safety gate, and testing plan.

- [x] **Step 2: Write this implementation plan**

Capture exact files, CI behavior, verification commands, and deployment notes.

### Task 2: Extend GitHub Actions CI

**Files:**

- Modify: `.github/workflows/ci.yml`

- [x] **Step 1: Add manual dispatch**

Add `workflow_dispatch:` to the workflow triggers so the Supabase deployment can be tested manually after secrets are configured.

- [x] **Step 2: Add a dependent Supabase deployment job**

Add a `deploy-supabase` job that needs `build`, runs only for pushes to `main` or manual dispatch, detects `supabase/` changes, and skips cleanly when no migration-related files changed.

- [x] **Step 3: Add bootstrap and dry-run safety**

Require `SUPABASE_MIGRATIONS_BOOTSTRAPPED=true` before applying migrations. Run `supabase db push --dry-run` before `supabase db push`.

### Task 3: Add Operator Documentation

**Files:**

- Create: `docs/SUPABASE_CICD.md`

- [x] **Step 1: Document GitHub secrets**

Explain each required secret and where to configure it in GitHub.

- [x] **Step 2: Document legacy migration bootstrap**

Explain `supabase db push --dry-run` and `supabase migration repair` at a high level so old migrations are marked as applied before automatic deployment is enabled.

- [x] **Step 3: Document everyday usage**

Explain the normal process for adding new migrations, pushing to `main`, and checking GitHub Actions.

### Task 4: Verify

**Files:**

- Test: `.github/workflows/ci.yml`
- Test: `docs/SUPABASE_CICD.md`

- [x] **Step 1: Inspect workflow YAML**

Run: `npx --yes prettier --check .github/workflows/ci.yml`

Expected: PASS or a clear formatting-only failure. GitHub Actions YAML is whitespace-sensitive, so inspect the file manually as well.

- [x] **Step 2: Run app checks**

Run: `npm run check`

Expected: PASS.

- [x] **Step 3: Review git diff**

Run: `git diff -- .github/workflows/ci.yml docs/SUPABASE_CICD.md docs/superpowers/specs/2026-05-04-supabase-cicd-design.md docs/superpowers/plans/2026-05-04-supabase-cicd.md`

Expected: only the CI/CD workflow and documentation changes are present.
