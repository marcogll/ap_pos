# Usar una imagen base de Node.js ligera
FROM node:18-alpine

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiar los archivos de definición de paquetes y dependencias
COPY package*.json ./

# Instalar las dependencias de producción
RUN npm install --production

# Copiar el resto de los archivos de la aplicación
COPY . .

# Exponer el puerto en el que corre la aplicación
EXPOSE 3000

# Definir el comando para iniciar la aplicación
CMD [ "node", "server.js" ]
