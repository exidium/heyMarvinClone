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

## Scripts

`dev`, `build`, `start`, `lint`, `typecheck`, `test` (vitest), `e2e` (playwright), `db:migrate`, `db:seed`, `db:reset`, `db:studio`, `mirror:generate`.

## Documentation

- `documentation/decisions.md`: every decision and why.
- `documentation/architecture.md`: folder layout and the main mechanisms.
