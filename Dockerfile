# Use Node with Puppeteer pre-installed
FROM ghcr.io/puppeteer/puppeteer:24.1.0

# Set working directory
WORKDIR /app

# Switch to root to install dependencies
USER root

# Copy package files
COPY package.json yarn.lock ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install all dependencies (including devDependencies for build)
RUN yarn install --frozen-lockfile --production=false

# Copy source code
COPY server ./server

# Build the server
RUN yarn build:server

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV NODE_ENV=production

# Expose port
EXPOSE 10000

# Run as non-root user for security
USER pptruser

# Start the server
CMD ["node", "server/dist/index.js"]
