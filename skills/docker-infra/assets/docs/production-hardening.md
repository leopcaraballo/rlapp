# Production Hardening Checklist — Docker Compose

## Pre-deployment Checks

### Credentials

- [ ] Replace default RabbitMQ credentials (`guest`/`guest`) with secrets
- [ ] Replace default PostgreSQL credentials with secrets
- [ ] Move all credentials to `.env` (never committed to Git)
- [ ] Verify `.gitignore` includes `.env`

### Ports

- [ ] Remove RabbitMQ Management UI port (`15672`) from production config
- [ ] Remove PostgreSQL external port (`5432`) from production config when not required
- [ ] Keep only necessary ports exposed publicly (frontend and API)

### Healthchecks

- [ ] Verify all services have `healthcheck` definitions
- [ ] Verify `depends_on` uses `condition: service_healthy`
- [ ] Backend services expose `/health` endpoints

### Volumes & Build

- [ ] Remove development volume mounts no longer needed in production
- [ ] Remove `command: npm run start:dev` overrides
- [ ] Use multi-stage Dockerfile with `production` target
- [ ] Remove `node_modules` volume exclusions

### Restart Policies

- [ ] Add `restart: unless-stopped` to all services
- [ ] Configure `deploy.resources.limits.memory` for production
