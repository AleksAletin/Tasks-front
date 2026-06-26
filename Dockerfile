# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies (leverage layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Build the app
COPY . .
RUN npm run build

# --- Serve stage ---
FROM nginx:1.27-alpine AS serve

# SPA-friendly nginx config (history fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static assets
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
