# Use Node.js 20 slim as the base image
FROM node:20-slim AS base

# Set working directory
WORKDIR /app

# Install dependencies (including devDependencies for tsc)
COPY package*.json ./
RUN npm install --include=dev

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-slim AS release
WORKDIR /app

# Copy only necessary files from build stage
COPY --from=base /app/package*.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist

# Expose the port the app runs on
ENV PORT=4000
EXPOSE 4000

# Start the application
CMD ["npm", "start"]
