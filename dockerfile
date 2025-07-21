# Usa una imagen oficial de Node.js
FROM node:18

# Crea el directorio de la app
WORKDIR /usr/src/app

# Copia los archivos de tu proyecto
COPY package*.json ./
COPY . .

# Instala dependencias
RUN npm install --legacy-peer-deps

# Construye la app si usas Next.js o React
RUN npm run build

# Expón el puerto (ajusta si tu app usa otro)
EXPOSE 3000

# Comando para iniciar la app
CMD ["npm", "start"]

# Si usas Next.js, puedes usar el siguiente comando en su lugar
# CMD ["npm", "run", "start:prod"]
