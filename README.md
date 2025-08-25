# AP POS - Sistema de Punto de Venta

Este proyecto es un sistema de Punto de Venta (POS) basado en la web, diseñado para la gestión eficiente de ventas, clientes y productos.

## Características Principales

*   **Autenticación Segura:** Sistema de inicio de sesión para usuarios con roles (administrador, usuario).
*   **Configuración Inicial:** Proceso de configuración guiado para el primer usuario administrador.
*   **Gestión de Clientes:** Creación, edición y eliminación de perfiles de clientes.
*   **Historial de Clientes:** Seguimiento detallado de los servicios y pagos de cada cliente.
*   **Registro de Movimientos:** Registra ventas, citas y otros movimientos financieros.
*   **Gestión de Productos y Servicios:** Define los productos y servicios que ofrece el negocio.
*   **Panel de Control (Dashboard):** Visualización de métricas clave como ingresos totales, desglose por servicio y método de pago (solo para administradores).
*   **Gestión de Usuarios:** Creación y administración de cuentas de usuario (solo para administradores).
*   **Contenerización:** Listo para desplegarse fácilmente con Docker y Docker Compose.

## Tecnologías Utilizadas

*   **Backend:** Node.js, Express.js
*   **Frontend:** HTML, CSS, JavaScript (sin frameworks)
*   **Base de Datos:** SQLite
*   **Autenticación:** express-session, bcryptjs
*   **Contenerización:** Docker, Docker Compose

## Cómo Empezar

Sigue estas instrucciones para poner en marcha el proyecto en tu máquina local.

### Prerrequisitos

*   Node.js (v18 o superior)
*   npm (generalmente incluido con Node.js)
*   Docker y Docker Compose (Opcional, para despliegue en contenedores)

### Instalación y Ejecución Local

1.  **Clona el repositorio:**
    ```bash
    git clone <URL-DEL-REPOSITORIO>
    cd ap_pos
    ```

2.  **Instala las dependencias del proyecto:**
    ```bash
    npm install
    ```

3.  **Inicia la aplicación:**
    ```bash
    npm start
    ```
    El servidor se iniciará en `http://localhost:3111`. La primera vez que accedas, serás redirigido a `/setup.html` para crear el usuario administrador.

### Despliegue con Docker (Recomendado)

1.  **Construye y levanta los contenedores:**
    ```bash
    docker-compose up --build -d
    ```
    La aplicación estará disponible en `http://localhost:3111`. El `-d` ejecuta los contenedores en segundo plano.

2.  **Para detener los contenedores:**
    ```bash
    docker-compose down
    ```

## Estructura del Proyecto

```
/
├── app.js             # Lógica principal del frontend
├── server.js          # Servidor backend (Express)
├── clients.js         # Lógica para la gestión de clientes
├── print.js           # Funcionalidad para imprimir recibos
├── setup.js           # Lógica para la página de configuración inicial
├── storage.js         # Utilidades para la base de datos
├── index.html         # Página principal de la aplicación
├── login.html         # Página de inicio de sesión
├── setup.html         # Página de configuración inicial
├── styles.css         # Estilos CSS
├── Dockerfile         # Define la imagen de Docker para la aplicación
├── docker-compose.yml # Orquesta el despliegue con Docker
├── package.json       # Dependencias y scripts del proyecto
└── src/               # Activos estáticos (imágenes, logos)
```

## Notas de Desarrollo (UI/UX)

*   **Logo Principal:** El logo `src/logo.png` ha sido redimensionado correctamente.
*   **Barra de Navegación:** Se ha ajustado para que las pestañas inactivas muestren solo el ícono, mientras que la activa muestra ícono y texto.
*   **Logo del Footer:** Hay un problema pendiente que impide que `src/logo_dev.png` se muestre correctamente.

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.