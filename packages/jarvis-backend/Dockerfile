FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY packages/jarvis-backend/package*.json ./packages/jarvis-backend/

RUN npm ci --omit=dev

# Copy source code
COPY packages/jarvis-backend/src ./packages/jarvis-backend/src
COPY packages/jarvis-backend/tsconfig.json ./packages/jarvis-backend/

# Build TypeScript
RUN npm run build --prefix packages/jarvis-backend

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "packages/jarvis-backend/dist/index.js"]
