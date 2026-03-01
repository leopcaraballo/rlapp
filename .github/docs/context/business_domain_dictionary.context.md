# Diccionario de Dominio de Negocio

## Términos canónicos

| Término                              | Definición canónica                                                   | Sinónimos aceptados    | Sinónimos rechazados                     | Ejemplo de uso correcto                  |
| ------------------------------------ | --------------------------------------------------------------------- | ---------------------- | ---------------------------------------- | ---------------------------------------- |
| Producto                             | Entidad del catálogo comercial que puede ser consultada y gestionada. | Ítem de catálogo       | Artículo genérico                        | "Registrar un producto"                  |
| Catálogo de Productos                | Conjunto de productos disponibles en el sistema.                      | Catálogo               | Inventario (cuando no se trata de stock) | "Disponible en el catálogo de productos" |
| Código de Producto (`code`)          | Identificador único de negocio del producto.                          | Código                 | ID técnico, SKU (si no está homologado)  | "El code no debe repetirse"              |
| Nombre de Producto (`name`)          | Nombre comercial legible del producto.                                | Nombre                 | Título                                   | "El name es obligatorio"                 |
| Descripción (`description`)          | Texto descriptivo funcional/comercial del producto.                   | Descripción            | Detalle libre (ambiguo)                  | "Incluir description del producto"       |
| Precio (`price`)                     | Valor monetario numérico del producto.                                | Precio                 | Costo (si no representa precio de venta) | "price debe ser numérico"                |
| Administrador del Sistema            | Rol autorizado para operaciones administrativas del catálogo.         | Admin                  | Usuario (genérico)                       | "Como Administrador del Sistema"         |
| Fecha de creación (`createdAt`)      | Marca temporal de creación del registro.                              | Fecha de creación      | Fecha alta (si no está definida)         | "Asignar createdAt automáticamente"      |
| Fecha de actualización (`updatedAt`) | Marca temporal de última actualización del registro.                  | Fecha de actualización | Fecha modificación (si no está definida) | "Asignar updatedAt automáticamente"      |

## Reglas semánticas del dominio

1. El término canónico para la entidad es **Producto**; evitar alternar con términos no homologados.
2. `code` siempre refiere a identificador de negocio único, no a clave técnica interna.
3. `price` representa valor monetario y debe ser numérico.
4. Los atributos `createdAt` y `updatedAt` son metadatos de auditoría temporal.

## Ambigüedades comunes a evitar

- "Disponible" sin contexto operativo (ej. visible en API, listado, o habilitado para venta).
- "Gestionar" sin especificar acción CRUD concreta.
- "Código" sin aclarar si se trata de `code` de negocio o identificador técnico.
