# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies (leverage layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Build the app.
# Vite inlines VITE_* env vars at build time, so they must be present here (not at
# runtime). The full-stack compose passes VITE_USE_BACKEND=true and VITE_API_URL=/api
# so the SPA hydrates from the real backend via the same-origin nginx proxy below.
ARG VITE_USE_BACKEND
ARG VITE_API_URL
ENV VITE_USE_BACKEND=${VITE_USE_BACKEND}
ENV VITE_API_URL=${VITE_API_URL}
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
