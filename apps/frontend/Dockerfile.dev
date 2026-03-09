# =============================================================================
# Frontend — Desarrollo (dev mode con hot reload)
# El puerto 3000 dentro del contenedor coincide con el mapeo en docker-compose.yml
# Hardened: HEALTHCHECK directive, minimal packages
# =============================================================================
FROM node:20-slim

WORKDIR /app

# Install wget for healthcheck (node:20-slim doesn't include curl or wget)
RUN apt-get update && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# legacy-peer-deps avoids strict peer resolution errors in dev
RUN npm install --legacy-peer-deps

COPY . .

# Internal port for Next.js dev server
EXPOSE 3000

# HEALTHCHECK: Built-in container health verification
# HUMAN CHECK: Adjust interval for dev vs production environments
HEALTHCHECK --interval=20s --timeout=10s --start-period=45s --retries=5 \
    CMD wget -q --spider http://localhost:3000/ || exit 1

# docker-compose.yml overrides this CMD with the same flags;
# kept here as a coherent fallback.
CMD ["npm", "run", "dev", "--", "-p", "3000", "-H", "0.0.0.0"]
