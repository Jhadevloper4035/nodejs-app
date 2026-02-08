# ---- Dependencies (prod) ----
FROM node:20-alpine AS deps_prod
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# ---- Dependencies (dev) ----
FROM node:20-alpine AS deps_dev
WORKDIR /app
COPY package*.json ./
RUN npm install

# ---- Base runtime (shared) ----
FROM node:20-alpine AS base
WORKDIR /app
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs
COPY . .
EXPOSE 3000

# ---- Production image ----
FROM base AS prod
COPY --from=deps_prod /app/node_modules ./node_modules
ENV NODE_ENV=production
USER nodeuser
CMD ["node","src/server.js"]

# ---- Development image (hot reload) ----
FROM base AS dev
COPY --from=deps_dev /app/node_modules ./node_modules
ENV NODE_ENV=development
# For file watching inside Docker (especially on Windows/macOS)
ENV CHOKIDAR_USEPOLLING=true
ENV NODEMON_LEGACY_WATCH=1
USER nodeuser
CMD ["npm","run","dev"]
