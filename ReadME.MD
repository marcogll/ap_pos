# AP-POS — Aplicación de Punto de Venta

Esta es una aplicación de punto de venta (POS) robusta y moderna, diseñada para ser simple, multiusuario y fácil de desplegar. Permite registrar clientes, gestionar ventas y usuarios, e imprimir recibos.

---

## Arquitectura y Tecnologías

*   **Frontend**: Single-Page Application (SPA) con **HTML5, CSS3 y JavaScript (Vanilla)**.
*   **Backend**: Servidor ligero con **Node.js y Express.js** que provee una API RESTful.
*   **Base de Datos**: **SQLite** (`ap-pos.db`), que hace la aplicación portable y fácil de respaldar.
*   **Contenerización**: Lista para desplegar con **Docker**.

## Características Principales

*   **Gestión de Ventas:** Crea nuevos movimientos (ventas, pagos) y genera recibos imprimibles.
*   **Base de Datos de Clientes:** Administra una lista de clientes con su información de contacto.
*   **Sistema de Roles Multi-usuario:**
  - **Administrador:** Tiene acceso a todas las funciones, incluyendo un dashboard de estadísticas, la configuración del negocio y la gestión de usuarios.
  - **Usuario:** Rol de vendedor con acceso limitado a la creación de ventas y gestión de clientes.
*   **Dashboard (Solo Admin):** Visualiza estadísticas clave como ingresos totales, número de servicios y un gráfico de ingresos por tipo de servicio.
*   **Exportación de Datos:** Exporta todos los movimientos a un archivo CSV.
*   **Persistencia de Datos:** Toda la información se guarda en una base de datos SQLite.

## Cómo Empezar

Para instrucciones detalladas sobre cómo instalar, ejecutar y desplegar la aplicación (tanto de forma local como con Docker), por favor consulta el archivo `README.md` dentro de la carpeta `ap-pos`.

```bash
cd ap-pos
cat README.md
```
