---
applyTo: "apps/frontend/src/**/*.{ts,tsx,js,jsx}"
---

> Scope: instrucciones para el frontend real del repositorio RLAPP.

# Instrucciones para Archivos de Frontend (Next.js 16 / React 19 / TypeScript)

## Stack y arquitectura

El frontend vive en `apps/frontend/src/` y usa App Router de Next.js con arquitectura hexagonal:

```
app -> components/hooks/context -> application -> domain -> infrastructure/services
```

- `src/app`: rutas y paginas App Router.
- `src/components`: UI reutilizable.
- `src/hooks`: estado, side effects y coordinacion UI.
- `src/application`: use cases.
- `src/domain`: modelos y puertos.
- `src/infrastructure` y `src/services`: adaptadores HTTP y realtime.

## Convenciones obligatorias

- CSS Modules para estilos locales. Mantener estilos globales solo donde ya exista convencion del proyecto.
- Componentes en PascalCase; hooks en camelCase con prefijo `use`; tipos y modelos en PascalCase.
- Variables de entorno con prefijo `NEXT_PUBLIC_` y acceso tipado desde `src/config/env.ts` cuando ya exista.
- Mantener separacion CQRS del frontend: comandos via gateways/adapters, lecturas via queries/read services.
- No introducir React Router. La navegacion se hace con App Router de Next.js.

## Llamadas a la API

- Reutilizar adaptadores existentes como `HttpCommandAdapter`, `HttpAppointmentAdapter` y servicios de `src/services/api/`.
- No hacer llamadas HTTP directas desde paginas si ya existe un hook o use case del modulo.
- Mantener headers de correlacion e idempotencia cuando el flujo ya los usa.
- Preservar traduccion de errores a UX desde las utilidades existentes.

## Estado y dependencias

- Reutilizar `DependencyContext` y `useDependencies()` antes de crear clientes paralelos.
- No duplicar estado global de autenticacion, alertas, conexion o cola.
- Mantener la integracion con SignalR/polling donde aplique; no reemplazarla con soluciones paralelas.

## Rutas

- Crear nuevas paginas bajo `src/app/<ruta>/page.tsx`.
- Usar `next/navigation` para redirecciones y navegacion programatica.
- Preservar guards, layouts y wrappers existentes del App Router.

## Nunca hacer

- No crear `src/App.jsx` ni estructura de React Router.
- No introducir `VITE_*`, `import.meta.env` ni supuestos de Vite.
- No mover logica de negocio al componente cuando ya existe un use case o hook dedicado.

> Para lineamientos generales, ver `.github/docs/lineamientos/dev-guidelines.md`.
