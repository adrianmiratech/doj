# Imagen para correr el bot de Discord como servicio persistente (Northflank,
# o cualquier otro host basado en contenedores). Instala el repo completo
# porque bot/index.ts comparte código con la web (src/lib/discord-*, Prisma).
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npx prisma generate

CMD ["npm", "run", "bot"]
