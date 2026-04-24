# Step 1: Build stage
FROM node:20-slim AS build

WORKDIR /app

# Install dependencies (including devDependencies for vite/tsc)
COPY package*.json ./
RUN npm install --include=dev

# Copy source code
COPY . .

# Build the application
# Note: VITE_ variables must be present in the environment during this step
RUN npm run build

# Step 2: Serve stage
FROM nginx:stable-alpine

# Copy build artifacts from build stage to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config if needed (optional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
