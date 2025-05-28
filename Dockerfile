# Multi-stage build for optimal production image

# Build stage
FROM oven/bun:1.2.13-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json bun.lock* ./

# Install all dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# Copy source code and configuration files
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Type check the application
RUN bun run typecheck

# Production stage
FROM oven/bun:1.2.13-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S radon && \
    adduser -S radon -u 1001

# Copy package.json and bun.lock for production install
COPY package.json bun.lock* ./

# Install only production dependencies
RUN bun install --frozen-lockfile --production && \
    bun pm cache rm

# Copy built application from builder stage
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/tsconfig.base.json ./tsconfig.base.json

# Create logs directory
RUN mkdir -p /app/logs

# Change ownership of the app directory to the radon user
RUN chown -R radon:radon /app

# Switch to non-root user
USER radon

# Set environment variables
ENV NODE_ENV=production
ENV BUN_ENV=production

# Health check to ensure the bot is running properly
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD pgrep -f "bun" > /dev/null || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the Discord bot
CMD ["bun", "run", "start"]

# Development stage (for docker-compose.dev.yml)
FROM oven/bun:1.2.13-alpine AS development

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S radon && \
    adduser -S radon -u 1001

# Copy package files
COPY package.json bun.lock* ./

# Install all dependencies (including dev dependencies)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Create logs directory
RUN mkdir -p /app/logs

# Change ownership of the app directory to the radon user
RUN chown -R radon:radon /app

# Switch to non-root user
USER radon

# Set environment variables
ENV NODE_ENV=development

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command for development (can be overridden)
CMD ["bun", "run", "dev"]
