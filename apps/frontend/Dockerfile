# Etapa 1: Base image
FROM node:22-alpine3.21 AS base

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

ARG NEXT_PUBLIC_WS_URL="http://localhost:5000"
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

RUN npm run build

# Etapa 4: Runtime final (Producción, Rootless)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# El runtime final no usa npm ni npx; se eliminan para reducir superficie de ataque.
RUN rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx

# Crear usuario y grupo no-root por seguridad (Principio de mínimo privilegio)
RUN addgroup -S -g 1001 nodejs \
    && adduser -S -u 1001 -G nodejs nextjs

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

HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:3000').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

# server.js es generado por next build en el output standalone
CMD ["node", "server.js"]
