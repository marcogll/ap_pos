# 1. Imagen Base: Usamos una imagen oficial de Node.js, versión 18-alpine.
# 'alpine' es una versión muy ligera, ideal para producción.
FROM node:18-alpine

# 2. Directorio de Trabajo: Establecemos el directorio de trabajo dentro del contenedor.
WORKDIR /app

# 3. Copiar Archivos de Dependencias: Copiamos package.json y package-lock.json.
# Hacemos esto en un paso separado para aprovechar el caché de Docker.
# Si no cambian estos archivos, Docker no reinstalará las dependencias.
COPY package*.json ./

# 4. Instalar Dependencias: Instalamos las dependencias del proyecto.
RUN npm install

# 5. Copiar el Resto de la Aplicación: Copiamos todos los demás archivos.
# Los archivos en .dockerignore serán excluidos automáticamente.
COPY . .

# 6. Exponer Puerto: Informamos a Docker que el contenedor escucha en el puerto 3000.
EXPOSE 3000

# 7. Comando de Inicio: El comando que se ejecutará cuando el contenedor inicie.
# Usamos 'npm start' que definiste en tu package.json.
CMD [ "npm", "start" ]