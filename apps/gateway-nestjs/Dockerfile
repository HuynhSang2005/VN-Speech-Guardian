# Multi-stage Dockerfile for gateway-nestjs
# Build stage
FROM node:22-bullseye-slim AS build
WORKDIR /usr/src/app

# Install build deps
COPY package.json package-lock.json ./
RUN npm ci --only=production=false --no-audit --no-fund

# Copy source
COPY tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts

# Build
RUN npm run build

# Production stage
FROM node:22-bullseye-slim AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Install production deps
COPY package.json package-lock.json ./
RUN npm ci --only=production --no-audit --no-fund

# Copy built app
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma

# Non-root user
RUN useradd --user-group --create-home --shell /bin/false appuser && chown -R appuser:appuser /usr/src/app
USER appuser

EXPOSE 3000
# Nest build outputs to dist/src/main.js in this workspace; use that path.
CMD ["node", "dist/src/main.js"]
