# Stage 1: Build the Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY client/package.json ./client/
RUN pnpm install --frozen-lockfile
COPY client/ ./client/
RUN pnpm --filter frontend build

# Stage 2: Setup the Backend
FROM node:20-slim
WORKDIR /app
RUN npm install -g pnpm

# Install openssl for Prisma
RUN apt-get update -y && apt-get install -y openssl

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY client/package.json ./client/
RUN pnpm install --prod --frozen-lockfile

COPY prisma/ ./prisma/
RUN pnpm exec prisma generate

COPY src/ ./src/
COPY --from=frontend-builder /app/client/dist ./client/dist

# Ensure environment variables are handled
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "src/index.js"]
