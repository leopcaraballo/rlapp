# =============================================================================
# Frontend — Desarrollo (dev mode con hot reload)
# El puerto 3000 dentro del contenedor coincide con el mapeo en docker-compose.yml
# =============================================================================
FROM node:20-slim

WORKDIR /app

# Instalar wget para el healthcheck (node:20-slim no incluye curl ni wget)
RUN apt-get update && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# legacy-peer-deps evita errores de resolución estricta de peers en dev
RUN npm install --legacy-peer-deps

COPY . .

# Puerto interno del servidor de desarrollo Next.js
EXPOSE 3000

# docker-compose.yml sobrescribe este CMD pasando los mismos flags;
# se mantiene aquí como fallback coherente.
CMD ["npm", "run", "dev", "--", "-p", "3000", "-H", "0.0.0.0"]
