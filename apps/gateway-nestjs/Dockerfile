# Multi-stage optimized Dockerfile for gateway-nestjs
# Build stage - use alpine for smaller image
FROM node:22-alpine AS dependencies
WORKDIR /usr/src/app

# Install system dependencies needed for native modules (optional)
RUN apk add --no-cache python3 make g++

# Copy package files and install ALL dependencies (dev + prod)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Build stage
FROM node:22-alpine AS build
WORKDIR /usr/src/app

# Copy dependencies from previous stage
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY --from=dependencies /usr/src/app/package*.json ./

# Copy source code and config files
COPY tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts

# Generate Prisma client and build application
RUN npx prisma generate && npm run build

# Production stage - minimal alpine image
FROM node:22-alpine AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Install only production dependencies in clean environment
COPY package.json package-lock.json ./
RUN npm ci --only=production --no-audit --no-fund --omit=dev && npm cache clean --force

# Copy built application and necessary files
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/node_modules/.prisma ./node_modules/.prisma

# Create non-root user for security
RUN addgroup -g 1001 -S appuser && adduser -S appuser -u 1001 -G appuser
RUN chown -R appuser:appuser /usr/src/app
USER appuser

# Expose port (match with docker-compose - Gateway should run on 3001)
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start application
CMD ["node", "dist/src/main.js"]
