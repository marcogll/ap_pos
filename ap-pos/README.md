# Ale Ponce | AlMa - Sistema de Punto de Venta

Este es un sistema de punto de venta (POS) simple y moderno basado en la web, diseñado para gestionar clientes, ventas y recibos de forma eficiente.

## Características Principales

- **Gestión de Ventas:** Crea nuevos movimientos (ventas, pagos) y genera recibos imprimibles.
- **Base de Datos de Clientes:** Administra una lista de clientes con su información de contacto.
- **Sistema de Roles:**
  - **Administrador:** Tiene acceso a todas las funciones, incluyendo un dashboard de estadísticas, la configuración del negocio y la gestión de usuarios.
  - **Usuario:** Rol de vendedor con acceso limitado a la creación de ventas y gestión de clientes.
- **Dashboard (Solo Admin):** Visualiza estadísticas clave como ingresos totales, número de servicios y un gráfico de ingresos por tipo de servicio.
- **Exportación de Datos:** Exporta todos los movimientos a un archivo CSV.
- **Persistencia de Datos:** Toda la información se guarda en una base de datos SQLite (`ap-pos.db`).
- **Listo para Docker:** Incluye un `Dockerfile` para una fácil contenerización y despliegue.

## Cómo Ejecutar la Aplicación

### Prerrequisitos

- [Node.js](https://nodejs.org/) (versión 18 o superior)
- [npm](https://www.npmjs.com/) (generalmente se instala con Node.js)

### Pasos para la Ejecución

1.  **Clonar el Repositorio (si aplica):**
    ```bash
    git clone <url-del-repositorio>
    cd ap-webapp/ap-pos
    ```

2.  **Instalar Dependencias:**
    Navega a la carpeta `ap-pos` y ejecuta el siguiente comando para instalar los paquetes necesarios:
    ```bash
    npm install
    ```

3.  **Iniciar el Servidor:**
    Una vez instaladas las dependencias, inicia el servidor con:
    ```bash
    npm start
    ```
    El servidor se ejecutará en `http://localhost:3000`.

4.  **Acceder a la Aplicación:**
    Abre tu navegador web y ve a `http://localhost:3000`.

5.  **Credenciales por Defecto:**
    - **Usuario:** `admin`
    - **Contraseña:** `password`

    **¡Importante!** Se recomienda cambiar la contraseña del administrador en la pestaña de "Configuración" después del primer inicio de sesión.

## Cómo Usar con Docker

1.  **Construir la Imagen de Docker:**
    Desde la carpeta `ap-pos`, ejecuta:
    ```bash
    docker build -t ap-pos-app .
    ```

2.  **Ejecutar el Contenedor:**
    Para ejecutar la aplicación en un contenedor, usa el siguiente comando. Esto mapeará el puerto 3000 y montará un volumen para que la base de datos persista fuera del contenedor.
    ```bash
    docker run -p 3000:3000 -v $(pwd)/data:/usr/src/app ap-pos-app
    ```
    *Nota: El comando anterior crea un directorio `data` en tu carpeta actual para almacenar `ap-pos.db`.*

## Autores
- **Gemini**
- **Marco G.**