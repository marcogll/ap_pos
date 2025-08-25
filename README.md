# Sistema de Punto de Venta de Master · Ale Ponce

Este es un sistema de Punto de Venta (POS) simple y eficiente, diseñado para gestionar las operaciones de un negocio de belleza. La aplicación permite administrar clientes, ventas, productos, y citas de forma centralizada.

## Características Principales

- **Dashboard (Solo Admin):** Visualización rápida de estadísticas clave como ingresos totales, número de servicios y gráficos de rendimiento.
- **Gestión de Ventas:** Creación de nuevos movimientos (ventas), generación de recibos para impresión y exportación de historial de ventas a formato CSV.
- **Gestión de Clientes:** Registro y consulta de clientes, con la posibilidad de ver su expediente completo, incluyendo historial de servicios y cursos.
- **Gestión de Productos:** Permite añadir, editar y eliminar tanto servicios como cursos ofrecidos por el negocio.
- **Configuración (Solo Admin):**
  - Ajuste de los datos del negocio para los recibos.
  - Gestión de credenciales de usuario.
  - Administración de múltiples usuarios (crear, editar, eliminar).
- **Autenticación:** Sistema de inicio de sesión seguro para proteger el acceso a la información.
- **Roles de Usuario:** Perfiles de Administrador (acceso total) y Usuario (acceso limitado a ventas y clientes).

## Despliegue con Docker

El sistema está diseñado para ser desplegado fácilmente utilizando Docker y Docker Compose, asegurando un entorno consistente y aislado.

### Prerrequisitos

- Tener instalado [Docker](https://docs.docker.com/get-docker/)
- Tener instalado [Docker Compose](https://docs.docker.com/compose/install/)

### Pasos para el despliegue

1.  Clona o descarga este repositorio en tu máquina local.
2.  Abre una terminal y navega hasta el directorio raíz del proyecto.
3.  Ejecuta el siguiente comando para construir y levantar el contenedor de la aplicación en segundo plano:

    ```bash
    docker-compose up -d --build
    ```

4.  Una vez que el comando termine, la aplicación estará disponible en tu navegador en la dirección `http://localhost:3000`.

La base de datos y toda la información se almacenarán localmente dentro de los volúmenes de Docker gestionados por `docker-compose`.
