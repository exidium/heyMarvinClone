# Deploying to a Hetzner VM

One VM in an EU data centre, Docker Compose, Caddy for HTTPS, nightly backups. Decisions D4, D10 and D21 apply.

## One-time setup

1. Create a VM (Ubuntu, 4 GB RAM is plenty) and, if recordings will be large, a Hetzner volume mounted at `/mnt/research-uploads`.
2. Install Docker Engine + Compose plugin and Caddy.
3. Clone the repository to `/srv/research`.
4. `cp deploy/.env.prod.example .env.prod` and set a strong `POSTGRES_PASSWORD`. Point `BACKUP_DIR` at a folder on the volume.
5. If using the volume for uploads, edit `docker-compose.prod.yml` so the `uploads` volume is a bind mount of `/mnt/research-uploads`.
6. Copy `deploy/Caddyfile` to `/etc/caddy/Caddyfile`, set the real hostname, `systemctl reload caddy`.

## Each release

```bash
cd /srv/research && git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod build
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm migrate
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

## First admin user

Until SSO exists, users are created by an admin. The very first one is created from the shell:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm migrate pnpm tsx scripts/create-user.ts admin@company.com "Full Name" --admin
```

The script prompts for a password. Further users are created from the Users page in the app.

## Backups

`scripts/backup.sh` runs the `backup` service: `pg_dump -Fc` of the database and a tarball of the uploads, both into `BACKUP_DIR`, keeping 14 days. Schedule it with cron at 02:30. Restore: `pg_restore -d research db-YYYY-MM-DD.dump` and untar the uploads into the volume.

## Limits

Caddy's `request_body max_size` and the app's `MAX_RECORDING_BYTES` must agree. The app never buffers uploads in memory.
