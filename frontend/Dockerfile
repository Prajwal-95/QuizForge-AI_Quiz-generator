# ── Build stage: compile the Vite + React SPA ─────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
# Bump this value (or change it to any new string) to force Render to rebuild
# from scratch instead of re-serving stale cached layers. This is needed
# because Render's registry-based Docker caching can serve old COPY layers
# even when source files have changed.
ARG CACHE_BUST=1
COPY . .
# VITE_API_BASE is injected at build time (Render auto-translates service
# env vars into Docker build args) so the built bundle knows where the
# FastAPI backend lives. Defaults to "/api" for local/single-origin setups.
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=${VITE_API_BASE}
# Google OAuth client ID, injected at build time. Empty by default (button hidden).
ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
RUN npm run build

# ── Serve stage: static files behind nginx with SPA fallback ──
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Custom config handles client-side routing (BrowserRouter) + API proxy.
# Use envsubst so the ${PORT} and ${API_BACKEND} variables in nginx.conf
# are resolved at container start (runtime).
RUN apk add --no-cache gettext
COPY nginx.conf /etc/nginx/conf.d/default.conf.template
# Render routes to the PORT env var (default 10000). EXPOSE is informational.
# Default PORT to 10000 at startup so envsubst never emits an empty "listen"
# line (which would crash nginx) if the env var is missing for any reason.
# API_BACKEND is set at runtime from the backend's RENDER_EXTERNAL_HOSTNAME.
EXPOSE 10000
CMD ["/bin/sh", "-c", "export PORT=${PORT:-10000}; export API_BACKEND=${API_BACKEND:-quizforge-api-ntm4.onrender.com}; envsubst '${PORT} ${API_BACKEND}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
