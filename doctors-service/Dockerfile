# Doctors Service Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install curl for downloading AWS DocumentDB certificate
RUN apk add --no-cache curl

# Download AWS DocumentDB global bundle certificate
RUN curl -O https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server.js"]
