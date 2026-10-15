# Research Repo

Self-hosted research repository for interview transcripts, recordings, highlights, tags and search. Internal tool; no billing, no AI in v1.

## Local setup

```bash
createdb research                 # Homebrew Postgres 17
cp .env.example .env              # adjust DATABASE_URL if needed
pnpm install                      # runs prisma generate
pnpm db:migrate                   # apply migrations
pnpm mirror:generate              # write synthetic seed data to fixtures/mirror
pnpm db:seed                      # import it
pnpm dev                          # http://localhost:3000
```

Local development uses the dev auth seam (`AUTH_DISABLED=true`, pick `DEV_USER=admin|editor|viewer` in `.env`). Set `AUTH_DISABLED=false` to use real sessions; seeded users sign in with the password `password12`.

## Scripts

`dev`, `build`, `start`, `lint`, `typecheck`, `test` (vitest), `e2e` (playwright), `db:migrate`, `db:seed`, `db:reset`, `db:studio`, `mirror:generate`.

## Documentation

- `documentation/decisions.md`: every decision and why.
- `documentation/architecture.md`: folder layout and the main mechanisms.
- `documentation/milestones.md`: what each milestone delivered and how it was verified.
- `documentation/deploy.md`: Hetzner deployment, releases, backups.
- `documentation/heymarvin-feature-gap.md`: what HeyMarvin offers, what this repository has, and what is still missing.

## Tests

`pnpm test` runs unit tests (parsers, anchors, role matrix) and, when `DATABASE_URL` points at a seeded database, the search SQL. `pnpm e2e` runs the Playwright specs against the dev server; `AUTH_E2E=1 pnpm e2e tests/e2e/auth.spec.ts` with `AUTH_DISABLED=false` covers real sessions.
