FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY jarvis-gateway/package*.json ./jarvis-gateway/

RUN npm ci --omit=dev

# Copy source code
COPY jarvis-gateway/src ./jarvis-gateway/src
COPY jarvis-gateway/tsconfig.json ./jarvis-gateway/

# Build TypeScript
RUN npm run build --prefix jarvis-gateway

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "jarvis-gateway/dist/index.js"]
