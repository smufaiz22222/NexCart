# Stage 1: Build the Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY client/package*.json ./client/
RUN npm install --prefix client
COPY client/ ./client/
RUN npm run build --prefix client

# Stage 2: Setup the Backend
FROM node:20-slim
WORKDIR /app

# Install openssl for Prisma
RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma/ ./prisma/
RUN npx prisma generate

COPY src/ ./src/
COPY --from=frontend-builder /app/client/dist ./client/dist

# Ensure environment variables are handled
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "src/index.js"]
