# Principios de Estructura del Proyecto

## Organización física esperada

- Estructura por feature/módulo de dominio (ej. `product`).
- Separación por capas dentro del módulo: `api`, `application`, `domain`, `infrastructure`.

## Convenciones de cohesión

1. Una historia de usuario debe concentrar cambios en un solo módulo funcional cuando sea posible.
2. Cambios transversales deben justificarse explícitamente por dependencia técnica real.
3. No crear carpetas nuevas fuera de la convención por feature + capas sin revisión arquitectónica.

## Límites de dispersión para una historia de sprint

- Umbral de módulos/features independientes impactados: **máximo 3**.
- Si supera 3 módulos independientes, se considera candidata a descomposición.
- La profundidad de cambios debe ser implementable en un sprint por un equipo estándar.

## Nomenclatura

- Módulos y carpetas en minúscula y nombres explícitos por responsabilidad.
- Evitar carpetas genéricas como `misc`, `common2` o `temp`.

## Señales de épica disfrazada

- Requiere cambios coordinados en múltiples bounded contexts sin cohesión funcional.
- Obliga a introducir nuevas estructuras arquitectónicas no contempladas.
- Exige modificación simultánea de más de 3 features independientes.
