# Backend multi-service Dockerfile (API / Worker)
# HUMAN CHECK: uses .NET 10.0 nightly images; align with TargetFramework net10.0

# ---------- Build stage ----------
FROM mcr.microsoft.com/dotnet/nightly/sdk:10.0 AS build
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
FROM mcr.microsoft.com/dotnet/nightly/aspnet:10.0 AS final
WORKDIR /app

# Copy published output
COPY --from=build /app/publish .

# Configure runtime
ARG APP_DLL
ENV ASPNETCORE_URLS=http://+:8080
# Pass the build ARG into an ENV so it exists at runtime
ENV APP_DLL=${APP_DLL}

EXPOSE 8080

# HUMAN CHECK: env vars are expanded at runtime; use shell to evaluate $APP_DLL
ENTRYPOINT ["sh", "-c", "dotnet /app/$APP_DLL"]

# Install lightweight HTTP client for healthchecks (curl)
RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl \
	&& rm -rf /var/lib/apt/lists/*
