# Imagen para correr el bot de Discord como servicio persistente (Northflank,
# o cualquier otro host basado en contenedores). Instala el repo completo
# porque bot/index.ts comparte código con la web (src/lib/discord-*, Prisma).
FROM node:22-slim

# Prisma lo pide explícitamente si falta: sin esto, "prisma generate" solo
# tira un warning y sigue, pero mejor tenerlo instalado.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Se copia el repo completo ANTES de "npm install": el script "postinstall"
# (prisma generate) necesita prisma/schema.prisma, así que no puede correr
# con solo package.json copiado.
COPY . .
RUN npm install

CMD ["npm", "run", "bot"]
