# 1. Imagen base: Node.js 18 en Alpine (ligera)
FROM node:18-alpine

# 2. Variable de entorno para producción
ENV NODE_ENV=production

# 3. Directorio de trabajo
WORKDIR /app

# 4. Copiar dependencias primero para aprovechar caché
COPY package*.json ./

# 5. Instalar dependencias de producción y limpiar caché
RUN npm ci --omit=dev && npm cache clean --force

# 6. Copiar el resto de la aplicación
COPY . .

# 7. Crear directorio para la base de datos y usuario no root
RUN mkdir -p /app/data && \
    addgroup -S app && adduser -S app -G app && \
    chown -R app:app /app
USER app

# 8. Exponer el puerto
EXPOSE 3111

# 9. Comando de inicio
CMD ["npm", "start"]

