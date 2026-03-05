FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --production --silent

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "run", "start"]
# ⚕️ HUMAN CHECK - Dockerfile del Frontend
# Asegurarse de usar una versión LTS de Node.js
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
# Use legacy-peer-deps to avoid strict peer dependency resolution during image build
# HUMAN CHECK: se aplica un parche mínimo para forzar la instalación en el contenedor.
RUN npm install --legacy-peer-deps

COPY . .

# ⚕️ HUMAN CHECK - Puerto expuesto
# Verificar que coincida con la variable de entorno FRONTEND_PORT
EXPOSE 3001

CMD ["npm", "run", "dev", "--", "-p", "3001", "-H", "0.0.0.0"]
