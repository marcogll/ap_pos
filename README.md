# Sistema de Punto de Venta de Master · Ale Ponce

Este es un sistema de Punto de Venta (POS) simple y eficiente, diseñado para gestionar las operaciones de un negocio de belleza. La aplicación permite administrar clientes, ventas, productos, y citas de forma centralizada.

## Características Principales

- **Dashboard:** Visualización rápida de estadísticas clave como ingresos totales, número de servicios y gráficos de rendimiento.
- **Gestión de Ventas Avanzada:** 
  - **Múltiples productos por venta**: Agregue varios servicios/cursos en una sola transacción
  - **Sistema de descuentos**: Descuentos por porcentaje o monto fijo con motivo
  - **Cálculo automático de totales**: Subtotal, descuento y total final en tiempo real
  - **Programación de citas**: Fecha y hora integradas en el flujo de ventas
  - **Generación de tickets**: Recibos optimizados para impresión térmica de 58mm
  - **Exportación a CSV**: Historial completo de ventas exportable
- **Gestión de Clientes:** Registro y consulta de clientes, con expediente completo incluyendo historial de servicios y cursos.
- **Gestión de Productos:** Administración completa de servicios y cursos con precios actualizables.
- **Configuración:**
  - Ajuste de los datos del negocio para los recibos
  - Gestión de credenciales de usuario
  - Administración de múltiples usuarios (crear, editar, eliminar)
- **Autenticación:** Sistema de inicio de sesión seguro para proteger el acceso a la información.
- **Roles de Usuario:** Perfiles de Administrador (acceso total) y Usuario (acceso limitado).

## Instalación y Despliegue

### Opción 1: Instalación Local (Desarrollo)

#### Prerrequisitos
- Node.js v18 o superior
- npm o yarn

#### Pasos
1. **Clonar el repositorio**:
   ```bash
   git clone <url-del-repositorio>
   cd ap_pos
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Ejecutar la aplicación**:
   ```bash
   npm start
   ```

4. **Acceder a la aplicación**:
   - URL: `http://localhost:3111`
   - En la primera ejecución serás redirigido a `/setup.html` para crear el usuario administrador

#### Base de datos
- Se crea automáticamente un archivo SQLite (`ap-pos.db`) en el directorio raíz
- Los datos se mantienen localmente en este archivo

### Opción 2: Despliegue con Docker

El sistema está diseñado para ser desplegado fácilmente utilizando Docker y Docker Compose, asegurando un entorno consistente y aislado.

#### Prerrequisitos

- Tener instalado [Docker](https://docs.docker.com/get-docker/)
- Tener instalado [Docker Compose](https://docs.docker.com/compose/install/)

#### Pasos para el despliegue

1. **Clona o descarga** este repositorio en tu máquina local.

2. **Configura las variables de entorno**:
   ```bash
   cp .env.example .env
   # Edita el archivo .env con una clave secreta segura
   ```

3. **Levanta** el contenedor:
   ```bash
   # Usar imagen desde Docker Hub (recomendado para producción)
   docker-compose up -d
   
   # O construir localmente (para desarrollo)
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

#### Persistencia de datos

- La base de datos SQLite se almacena en un volumen Docker persistente
- Los datos se mantienen entre reinicios y actualizaciones del contenedor
- Para más información sobre Docker, consulta [DOCKER.md](./DOCKER.md)

## Novedades de la Versión 1.5.1

### 🐛 **Correcciones Críticas**
- **Fechas corregidas**: Resuelto bug que mostraba "undefined" en fechas de tickets
- **Función esc() mejorada**: Corregida regex que causaba corrupción de fechas
- **Validación de fechas**: Sistema robusto para manejo de fechas en tickets

### 🎨 **Mejoras de Interfaz**
- **Tickets alineados**: Todo el contenido del ticket alineado a la izquierda para mejor legibilidad
- **Interface compacta**: Productos más compactos para reducir scroll necesario
- **Auto-colapso**: Categorías de productos se colapsan automáticamente tras agregar items
- **Botón limpieza removido**: Eliminado botón de limpiar formulario por simplicidad

### 📱 **Favicons Integrados**
- **Iconos profesionales**: Soporte completo para favicons en todos los dispositivos
- **Apple Touch Icon**: Optimizado para dispositivos iOS
- **Web Manifest**: Configuración PWA para instalación en dispositivos
- **Multi-resolución**: Iconos 16x16, 32x32, 192x192, 512x512 para todas las pantallas

### ⚡ **Optimizaciones UX**
- **Cache-busting**: Sistema de versiones para actualizaciones inmediatas
- **Fechas robustas**: Validación completa de fechas con padding automático
- **Navegación fluida**: Mejor experiencia de usuario en productos y formularios

> **💡 Tip para limpiar formularios**: 
> - **Mac**: Presiona `Cmd + Shift + R` para refrescar y limpiar formularios
> - **Windows/Linux**: Presiona `Ctrl + Shift + R` para refrescar y limpiar formularios

---

## Historial - Versión 1.5.0

### 🎫 **Reorganización de Interface**
- **Subpestañas en Ventas**: Nueva estructura con "💰 Ventas" y "🎫 Tickets"  
- **Dashboard limpio**: Movida sección de movimientos a subpestaña de Tickets
- **Navegación mejorada**: Interfaz más organizada y lógica

### 💳 **Sistema de Anticipos Avanzado**
- **Anticipos manuales**: Aplicar anticipos no registrados con confirmación
- **Checkbox de seguridad**: Confirmación obligatoria para anticipos manuales
- **Integración completa**: Anticipos se aplican como descuentos automáticamente
- **Control de duplicación**: Sistema previene aplicar el mismo anticipo múltiples veces

### 👥 **Gestión de Clientes Mejorada**
- **Público General**: Sistema automático para ventas sin cliente específico
- **Campo opcional**: Cliente ya no es obligatorio en ventas
- **Tickets genéricos**: Soporte para ventas a público general

### 🎨 **Mejoras Visuales**
- **Header sólido**: Eliminado gradiente por color sólido negro
- **Precios alineados**: Grid layout mejorado para mejor presentación
- **Orden de servicios**: Clean Girl → Elegant → Mystery → Seduction con sus retoques
- **Interfaz consistente**: Colores y estilos uniformes

### ⚡ **Optimizaciones Técnicas**
- **Base de datos mejorada**: Campo sort_order para control de ordenamiento
- **Subpestañas funcionales**: JavaScript para navegación entre secciones
- **Validaciones reforzadas**: Mejor control de formularios y datos
