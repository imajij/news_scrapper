# Minimal production image (no Puppeteer)
FROM node:20-alpine AS base
ENV NODE_ENV=production
WORKDIR /app

# Install production deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy source
COPY src ./src

# Expose port
EXPOSE 5000

# Health and start
CMD ["node", "src/server.js"]

# Note:
# If you want to enable Puppeteer, switch to a Debian-based image and install
# necessary system libs (this increases image size):
# FROM node:20-bookworm
# RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
# RUN npm ci
# And ensure "puppeteer" is added to dependencies, plus set USE_PUPPETEER=true
