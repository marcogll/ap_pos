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

#### Persistencia de datos

- La base de datos SQLite se almacena en un volumen Docker persistente
- Los datos se mantienen entre reinicios y actualizaciones del contenedor
- Para más información sobre Docker, consulta [DOCKER.md](./DOCKER.md)

## Novedades de la Versión 1.3.5

### 🚀 **Nueva Interfaz de Ventas**
- **Formulario modernizado**: Diseño más intuitivo y profesional
- **Múltiples productos**: Agrega varios servicios/cursos en una sola venta
- **Sistema de cantidades**: Especifica la cantidad de cada producto

### 💰 **Sistema de Descuentos Avanzado**
- **Interfaz colapsable**: Sección de descuentos elegante y fácil de usar
- **Dos tipos de descuento**: Por porcentaje (%) o monto fijo ($)
- **Motivo del descuento**: Registro del motivo para auditoría
- **Preview en tiempo real**: Ve el descuento aplicado instantáneamente

### 📅 **Gestión de Citas Mejorada**
- **Campos de fecha intuitivos**: DD/MM/AAAA más fácil de usar
- **Horarios preconfigurados**: Selección rápida de horas disponibles
- **Integración con ventas**: Cita programada directamente al crear la venta

### 🧾 **Tickets Optimizados**
- **Formato térmico 58mm**: Diseño específico para impresoras térmicas
- **Información completa**: Productos, cantidades, descuentos y totales
- **QR Code**: Para feedback de clientes
- **Fechas corregidas**: Formato DD/MM/YYYY HH:MM sin errores de "undefined"
- **Etiquetas en negrita**: Folio y Fecha destacados visualmente

### ⚡ **Mejoras Técnicas**
- **Cálculos en tiempo real**: Totales actualizados automáticamente
- **Validaciones mejoradas**: Mejor control de errores
- **Base de datos optimizada**: Persistencia de datos mejorada
- **API REST**: Migración completa de localStorage a servidor
