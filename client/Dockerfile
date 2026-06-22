# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
# Installs dependencies and builds the Vite/React production bundle.
FROM node:22-alpine AS builder

WORKDIR /app

# Accept the API URL at build time so Vite can bake it into the bundle.
# Passed via docker-compose.prod.yml build.args.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Copy manifests first for layer caching
COPY package*.json ./

# Reproducible install — use lockfile, fail on mismatch
RUN npm ci

# Copy source and config
COPY . .

# Build static output → dist/
RUN npm run build

# ─── Stage 2: Runner ──────────────────────────────────────────────────────────
# Serve the compiled bundle with Nginx (no Node runtime in the final image).
FROM nginx:stable-alpine AS runner

# Remove the default Nginx placeholder page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy our custom Nginx config (handles SPA routing + headers)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
