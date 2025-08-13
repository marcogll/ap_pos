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

1.  **Clonar el Repositorio:**
    ```bash
    git clone https://github.com/marcogll/ap_pos.git
    cd ap_pos/ap-pos
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
    Para ejecutar la aplicación en un contenedor, usa el siguiente comando. Esto mapeará el puerto 3000 y montará un volumen para que la base de datos persista fuera del contenedor, en una nueva carpeta `data` que se creará en tu directorio actual.
    ```bash
    docker run -p 3000:3000 -v $(pwd)/data:/usr/src/app/data ap-pos-app
    ```
    *Nota: La primera vez que ejecutes esto, se creará un directorio `data` en tu carpeta actual para almacenar `ap-pos.db`.*

## Autores
- **Gemini**
- **Marco G.**

---

## Diagnóstico de Impresión (CUPS en Linux)

Si tienes problemas para imprimir recibos en un entorno Linux, sigue estos pasos en la terminal de la computadora donde la impresora está conectada para diagnosticar el problema.

### Paso 1: Verificar el Estado de la Impresora

Este comando lista todas las impresoras configuradas en el sistema y muestra su estado. Reemplaza `TICKETS` con el nombre real de tu impresora.

```bash
lpstat -p -d
```

**Qué buscar:**
- Deberías ver una línea como `printer TICKETS is idle...`.
- Si tu impresora no aparece en la lista, no está instalada o CUPS no la detecta.
- Anota el nombre exacto de la impresora, ya que lo necesitarás para los siguientes pasos y para la configuración de la aplicación.

### Paso 2: Enviar una Página de Prueba Directa

Esto permite verificar si el sistema de impresión (CUPS) puede comunicarse con la impresora, ignorando cualquier problema de la aplicación.

1.  **Crea un archivo de texto de prueba:**
    ```bash
    echo "Prueba de impresión para la impresora TICKETS" > /tmp/prueba.txt
    ```

2.  **Envía el archivo a imprimir:** (Recuerda usar el nombre exacto de tu impresora)
    ```bash
    lp -d TICKETS /tmp/prueba.txt
    ```

**¿Se imprimió la página?**
- **Sí:** El sistema de impresión funciona correctamente. El problema probablemente está en la configuración de la aplicación. Asegúrate de que esté usando el nombre correcto de la impresora.
- **No:** El problema está en la comunicación entre CUPS y la impresora. Continúa al siguiente paso.

### Paso 3: Revisar la Cola y los Registros de Errores

Si la página de prueba no se imprimió, estos comandos pueden darte más pistas.

1.  **Revisar la cola de impresión:**
    ```bash
    lpq -a
    ```
    *Esto te mostrará si el trabajo está atascado en la cola.*

2.  **Consultar el registro de errores de CUPS:**
    ```bash
    tail -n 20 /var/log/cups/error_log
    ```
    *Busca mensajes de error recientes que mencionen el nombre de tu impresora, "filter failed", "driver" o problemas de conexión.*
