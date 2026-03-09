# Arquitectura del Proyecto (Nivel Alto)

## Estilo arquitectónico

- Arquitectura en capas con separación por módulos de dominio.
- Backend reactivo orientado a casos de uso (WebFlux + servicios de aplicación + repositorios).

## Bounded contexts

- **Catálogo de Productos**: alta, consulta, actualización y baja de productos.
- **Gestión de Usuarios y Roles**: autenticación/autorización.
- **Facturación**: procesos financieros posteriores a venta.

## Módulos principales y responsabilidades

- `product-api`: controladores REST de productos.
- `product-application`: casos de uso y reglas de negocio de productos.
- `product-domain`: entidades/objetos de valor y validaciones de dominio.
- `product-infrastructure`: repositorios y adaptadores técnicos.

## Restricciones arquitectónicas

1. El contexto de Catálogo no debe incluir lógica de Facturación.
2. Los controladores no contienen lógica de negocio compleja; delegan en aplicación.
3. El dominio no depende de infraestructura.
4. Debe mantenerse consistencia del estilo reactivo de extremo a extremo.

## Criterios de encaje para requerimientos

- Requerimientos de creación de producto pertenecen al bounded context **Catálogo de Productos**.
- Cambios que crucen Catálogo + Facturación en una sola historia requieren descomposición.
