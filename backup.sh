#!/bin/bash

# Script de backup para AP-POS
# Crea backup de la base de datos SQLite

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup-ap-pos-${TIMESTAMP}.db"

echo "💾 Creando backup de la base de datos AP-POS..."

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# Verificar que el contenedor esté corriendo
if ! docker compose ps ap-pos | grep -q "running"; then
    echo "❌ Error: El contenedor ap-pos no está corriendo"
    echo "   Ejecuta: docker compose up -d"
    exit 1
fi

# Crear backup desde el contenedor
echo "📋 Copiando base de datos..."
docker compose exec -T ap-pos cp /app/data/ap-pos.db /tmp/backup.db

# Copiar al host
docker compose cp ap-pos:/tmp/backup.db "${BACKUP_DIR}/${BACKUP_FILE}"

# Limpiar archivo temporal
docker compose exec -T ap-pos rm /tmp/backup.db

# Verificar que el backup se creó correctamente
if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    BACKUP_SIZE=$(ls -lh "${BACKUP_DIR}/${BACKUP_FILE}" | awk '{print $5}')
    echo "✅ Backup creado exitosamente:"
    echo "   📁 Archivo: ${BACKUP_DIR}/${BACKUP_FILE}"
    echo "   📊 Tamaño: ${BACKUP_SIZE}"
    
    # Mostrar backups disponibles
    echo ""
    echo "📂 Backups disponibles:"
    ls -lht "${BACKUP_DIR}"/ | head -10
else
    echo "❌ Error: No se pudo crear el backup"
    exit 1
fi

# Opcional: Limpiar backups antiguos (mantener solo los últimos 10)
echo "🧹 Limpiando backups antiguos (manteniendo los últimos 10)..."
ls -t "${BACKUP_DIR}"/backup-ap-pos-*.db 2>/dev/null | tail -n +11 | xargs -r rm
echo "✅ Limpieza completada"