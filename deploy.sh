#!/bin/bash

# Script de despliegue para AP-POS
# Autor: Sistema AP-POS

set -e  # Exit on any error

echo "🚀 Desplegando AP-POS con Docker..."

# Verificar que Docker esté instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker no está instalado"
    echo "   Instalar desde: https://docs.docker.com/get-docker/"
    exit 1
fi

# Verificar que Docker Compose esté disponible
if ! docker compose version &> /dev/null; then
    echo "❌ Error: Docker Compose no está disponible"
    echo "   Instalar desde: https://docs.docker.com/compose/install/"
    exit 1
fi

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env desde template..."
    cp .env.example .env
    echo "⚠️  IMPORTANTE: Edita el archivo .env con una clave secreta segura antes de usar en producción"
fi

# Detener contenedores existentes si están corriendo
echo "🔄 Deteniendo contenedores existentes..."
docker compose down 2>/dev/null || true

# Construir y levantar los servicios
echo "🏗️  Construyendo y levantando servicios..."
docker compose up -d --build

# Esperar un poco para que el servicio inicie
echo "⏳ Esperando que el servicio inicie..."
sleep 10

# Verificar el estado
echo "🔍 Verificando estado del servicio..."
docker compose ps

# Mostrar logs recientes
echo "📋 Logs recientes:"
docker compose logs --tail=20 ap-pos

# Verificar que el servicio responde
echo "🏥 Verificando conectividad..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3111/login.html | grep -q "200"; then
    echo "✅ ¡Despliegue exitoso!"
    echo "🌐 Aplicación disponible en: http://localhost:3111"
    echo "📖 Para más información, consulta DOCKER.md"
else
    echo "⚠️  El servicio está iniciando. Verifica con: docker compose logs ap-pos"
fi