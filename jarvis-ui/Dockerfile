FROM node:18-alpine as builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY jarvis-ui/package*.json ./jarvis-ui/

RUN npm ci

# Copy source code
COPY jarvis-ui ./jarvis-ui

# Build production bundle
RUN npm run build --prefix jarvis-ui

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve to run static site
RUN npm install -g serve

# Copy built app from builder
COPY --from=builder /app/jarvis-ui/dist ./dist

# Expose port
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5173 || exit 1

# Start application
CMD ["serve", "-s", "dist", "-l", "5173"]
