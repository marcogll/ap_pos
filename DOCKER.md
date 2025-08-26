# Guía de Docker para AP-POS

## Configuración inicial

1. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   # Editar .env con tus valores específicos
   ```

2. **Construir y levantar los servicios**:
   ```bash
   docker-compose up -d --build
   ```

3. **Verificar que esté funcionando**:
   ```bash
   docker-compose ps
   docker-compose logs ap-pos
   ```

4. **Acceder a la aplicación**:
   - URL: http://localhost:3111
   - Primera vez: será redirigido a `/setup.html` para crear el usuario admin

## Comandos útiles

### Ver logs en tiempo real
```bash
docker-compose logs -f ap-pos
```

### Reiniciar el servicio
```bash
docker-compose restart ap-pos
```

### Detener y eliminar todo
```bash
docker-compose down
```

### Backup de la base de datos
```bash
# Crear backup
docker-compose exec ap-pos cp /app/data/ap-pos.db /app/data/backup-$(date +%Y%m%d_%H%M%S).db

# O desde el host
docker cp ap-pos:/app/data/ap-pos.db ./backup-ap-pos.db
```

### Restaurar base de datos
```bash
# Detener el servicio
docker-compose stop ap-pos

# Restaurar desde backup
docker cp ./backup-ap-pos.db ap-pos:/app/data/ap-pos.db

# Reiniciar
docker-compose start ap-pos
```

## Persistencia de datos

- La base de datos SQLite se almacena en el volumen Docker `ap_pos_data`
- Los datos persisten entre reinicios del contenedor
- El volumen se mantiene incluso si el contenedor se elimina

## Troubleshooting

### El contenedor no inicia
```bash
# Ver logs detallados
docker-compose logs ap-pos

# Verificar el health check
docker-compose ps
```

### Problemas de permisos
```bash
# Verificar permisos del volumen
docker-compose exec ap-pos ls -la /app/data/
```

### Reset completo
```bash
# CUIDADO: Esto elimina todos los datos
docker-compose down -v
docker-compose up -d --build
```