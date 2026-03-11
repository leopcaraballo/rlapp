# Backend multi-service Dockerfile (API / Worker)
# HUMAN CHECK: usa imágenes estables de .NET 10 para reducir fallos de red y variabilidad de nightly en builds locales.
# Hardened: non-root user, HEALTHCHECK, minimal attack surface

# ---------- Build stage ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Build arguments
ARG PROJECT=src/Services/WaitingRoom/WaitingRoom.API/WaitingRoom.API.csproj
ARG APP_DLL=WaitingRoom.API.dll

# Copy all sources
COPY . .

# Restore and publish
RUN dotnet restore ${PROJECT}
RUN dotnet publish ${PROJECT} -c Release -o /app/publish --no-restore

# ---------- Runtime stage ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# HUMAN CHECK: mantener metadatos actualizados para trazabilidad de imagen en CI/CD
LABEL org.opencontainers.image.title="rlapp-backend" \
    org.opencontainers.image.description="RLAPP backend service (API/Worker runtime image)" \
    org.opencontainers.image.vendor="RLAPP Team"

# SECURITY: Create non-root user for runtime execution
# HUMAN CHECK: Verify that the application does not require root privileges at runtime
RUN groupadd --gid 1001 appgroup \
    && useradd --uid 1001 --gid appgroup --shell /bin/false --create-home appuser

# Copy published output with correct ownership
COPY --from=build --chown=appuser:appgroup /app/publish .

# Configure runtime
ARG APP_DLL
ENV ASPNETCORE_URLS=http://+:8080
# Pass the build ARG into an ENV so it exists at runtime
ENV APP_DLL=${APP_DLL}

# Install curl for healthcheck (Debian-based image)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# SECURITY: Ensure /tmp is writable for the non-root user (needed for ASP.NET temp files)
RUN mkdir -p /tmp && chown appuser:appgroup /tmp

EXPOSE 8080

# SECURITY: Switch to non-root user
USER appuser

# HEALTHCHECK: Built-in container health verification
# HUMAN CHECK: Adjust interval/timeout based on production SLA requirements
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health/live || exit 1

# HUMAN CHECK: env vars are expanded at runtime; use shell to evaluate $APP_DLL
ENTRYPOINT ["sh", "-c", "dotnet /app/$APP_DLL"]
