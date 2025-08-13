# AP-POS — Aplicación de Punto de Venta (v0.3)

Esta es una aplicación de punto de venta (POS) diseñada para ser simple y robusta. Permite registrar clientes, gestionar movimientos (pagos, anticipos) e imprimir recibos.

La versión actual (v0.3) se enfoca en mejorar la experiencia de usuario (UX) y la interfaz (UI) para hacerla más intuitiva y agradable de usar.

---

## Arquitectura y Tecnologías

*   **Frontend**: Single-Page Application (SPA) con **HTML5, CSS3 y JavaScript (Vanilla)**.
*   **Backend**: Servidor ligero con **Node.js y Express.js** que provee una API REST.
*   **Base de Datos**: **SQLite** (`ap-pos.db`), que hace la aplicación portable y fácil de respaldar.

## Novedades en la Versión 0.3

Se han implementado las siguientes mejoras en la interfaz y experiencia de usuario:

*   **Diseño de Formularios Mejorado**:
    *   El formulario de **Clientes** ahora utiliza un diseño de dos columnas, haciendo que la información sea más fácil de leer y rellenar.
    *   El formulario de **Configuración** agrupa los campos de dirección (`Colonia` y `C.P.`) para mayor claridad y se han añadido textos de ejemplo (`placeholders`).
*   **Estilo de Botones Consistente**:
    *   Se ha añadido más espacio y márgenes a los botones de acción.
    *   Los botones de "Limpiar" o "Cancelar" ahora son de color rojo para distinguirlos claramente de las acciones principales.
*   **Flujo de Trabajo Optimizado**:
    *   Después de generar un recibo, el cursor se posiciona automáticamente en el campo "Cliente", agilizando la creación de un nuevo movimiento.
*   **Títulos Clarificados**:
    *   Se han mejorado los títulos de algunas secciones para que sean más descriptivos (e.g., "Movimientos Recientes").

## Características Principales

*   Gestión de Clientes (Crear, Editar, Eliminar).
*   Registro de Movimientos (Pagos, Anticipos).
*   Generación de Folios automáticos e incrementales.
*   Impresión de Recibos en formato de 58mm.
*   Exportación de todos los movimientos a un archivo CSV.
*   Configuración de los datos del negocio para personalizar los recibos.

## Requisitos del Sistema

*   **Node.js**: Necesario para ejecutar el servidor backend. Descárgalo desde [nodejs.org](https://nodejs.org/).
*   **Navegador Web**: Un navegador moderno como Google Chrome, Firefox, o Edge.

## Instalación y Ejecución

1.  **Navega al directorio del proyecto**:
    ```bash
    cd ap-pos
    ```
2.  **Instala las dependencias**:
    ```bash
    npm install
    ```
3.  **Inicia el servidor**:
    ```bash
    npm start
    ```
    El servidor se ejecutará en `http://localhost:3000`.

4.  **Abre la aplicación**:
    Abre el archivo `index.html` en tu navegador.

## Estructura de Archivos

```
ap-pos/
├─ index.html           # Interfaz de usuario principal.
├─ styles.css           # Estilos para la aplicación y la impresión.
├─ app.js               # Lógica del frontend (eventos, renderizado, UI).
├─ storage.js           # Módulo del frontend para comunicarse con la API.
├─ print.js             # Lógica para generar el recibo.
│
├─ server.js            # Servidor backend (Node.js/Express).
├─ package.json         # Dependencias y scripts del proyecto.
├─ ap-pos.db            # Archivo de la base de datos SQLite.
│
└─ src/
   └─ logo.png          # Logo del negocio.
```

## Consideraciones

*   **Portabilidad**: Para mover la aplicación, copia la carpeta `ap-pos` completa.
*   **Respaldo**: Para respaldar tus datos, simplemente haz una copia del archivo `ap-pos.db`.
