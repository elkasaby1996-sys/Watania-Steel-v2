# Repo Setup Notes

## Node/tooling
- Node version: `20` (see `.nvmrc`)
- Install deps: `npm ci`
- Local dev: `npm run dev`

## Quality gates
- Typecheck: `npm run typecheck`
- Production check: `npm run check`
- CI workflow: `.github/workflows/ci.yml`

## Deployment
- Netlify uses:
  - Build command: `npm run build`
  - Publish dir: `dist`
- Required Netlify env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Logging policy
- Use `src/lib/logger.ts` for debug logs.
- `console.log/debug/info` are stripped from production bundles by Vite config.
