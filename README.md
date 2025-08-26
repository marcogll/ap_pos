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

1. **Clona o descarga** este repositorio en tu máquina local.

2. **Configura las variables de entorno**:
   ```bash
   cp .env.example .env
   # Edita el archivo .env con una clave secreta segura
   ```

3. **Construye y levanta** el contenedor:
   ```bash
   docker-compose up -d --build
   ```

4. **Verifica que esté funcionando**:
   ```bash
   docker-compose ps
   docker-compose logs ap-pos
   ```

5. **Accede a la aplicación**:
   - URL: `http://localhost:3111`
   - En la primera ejecución serás redirigido a `/setup.html` para crear el usuario administrador

### Persistencia de datos

- La base de datos SQLite se almacena en un volumen Docker persistente
- Los datos se mantienen entre reinicios y actualizaciones del contenedor
- Para más información sobre Docker, consulta [DOCKER.md](./DOCKER.md)
