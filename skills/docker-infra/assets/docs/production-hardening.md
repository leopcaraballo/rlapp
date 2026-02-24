# Production Hardening Checklist — Docker Compose

## Pre-deployment Checks

### Credentials

- [ ] Replace default RabbitMQ credentials (`guest`/`guest`) with secrets
- [ ] Replace default MongoDB credentials (`admin`/`admin123`) with secrets
- [ ] Move all credentials to `.env` (never committed to Git)
- [ ] Verify `.gitignore` includes `.env`

### Ports

- [ ] Remove RabbitMQ Management UI port (`15672`) from production config
- [ ] Remove MongoDB external port (`27017`) from production config
- [ ] Keep only necessary ports: Producer API (`3000`), Frontend (`3001`)

### Healthchecks

- [ ] Verify all services have `healthcheck` definitions
- [ ] Verify `depends_on` uses `condition: service_healthy`
- [ ] NestJS services expose `/health` endpoint

### Volumes & Build

- [ ] Remove development volume mounts (`./backend/producer:/app`)
- [ ] Remove `command: npm run start:dev` overrides
- [ ] Use multi-stage Dockerfile with `production` target
- [ ] Remove `node_modules` volume exclusions

### Restart Policies

- [ ] Add `restart: unless-stopped` to all services
- [ ] Configure `deploy.resources.limits.memory` for production
