# Usar una imagen base de Node.js
FROM node:18-alpine

# Establecer el directorio de trabajo en el contenedor
WORKDIR /usr/src/app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar las dependencias de la aplicación
RUN npm install

# Copiar el resto de los archivos de la aplicación
COPY . .

# Crear un directorio para la base de datos persistente y definirlo como volumen
RUN mkdir -p /usr/src/app/data
VOLUME /usr/src/app/data

# Establecer la ruta de la base de datos a través de una variable de entorno
ENV DB_PATH /usr/src/app/data/ap-pos.db

# Exponer el puerto en el que corre la aplicación
EXPOSE 3000

# Comando para iniciar la aplicación
CMD [ "node", "server.js" ]
