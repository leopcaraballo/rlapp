# ⚕️ HUMAN CHECK - Dockerfile del Frontend
# Asegurarse de usar una versión LTS de Node.js
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
# Use legacy-peer-deps to avoid strict peer dependency resolution during image build
# HUMAN CHECK: se aplica un parche mínimo para forzar la instalación en el contenedor.
RUN npm install --legacy-peer-deps

COPY . .

# ⚕️ HUMAN CHECK - Puerto expuesto
# Verificar que coincida con la variable de entorno FRONTEND_PORT
EXPOSE 3001

CMD ["npm", "run", "dev", "--", "-p", "3001", "-H", "0.0.0.0"]
