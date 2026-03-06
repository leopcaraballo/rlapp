# Etapa 1: Base image
FROM node:20-alpine AS base
# Instalar libc compatibilidad requerida por algunos paquetes en Alpine
RUN apk add --no-cache libc6-compat

# Etapa 2: Dependencias
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Etapa 3: Constructor
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Configurar telemetría como deshabilitada
ENV NEXT_TELEMETRY_DISABLED=1

# Proveer variable default en build-time para evitar fallos de renderizado estático
ARG NEXT_PUBLIC_API_BASE_URL="http://localhost:5000"
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

RUN npm run build

# Etapa 4: Runtime final (Producción, Rootless)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Crear usuario y grupo no-root por seguridad (Principio de mínimo privilegio)
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Configurar carpetas estáticas y permisos standalone
COPY --from=builder /app/public ./public

# Configurar permisos al copiar el standalone
RUN mkdir .next \
    && chown nextjs:nodejs .next

# Copiar el output de standalone y estáticos en base a la optimización de Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js es generado por next build en el output standalone
CMD ["node", "server.js"]
