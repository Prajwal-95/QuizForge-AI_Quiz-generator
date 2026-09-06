# ── Build stage: compile the Vite + React SPA ─────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# VITE_API_BASE is injected at build time (Render/Railway) so the built
# bundle knows where the FastAPI backend lives. Defaults to "/api" for
# single-origin deployments handled by the nginx proxy.
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=${VITE_API_BASE}
RUN npm run build

# ── Serve stage: static files behind nginx with SPA fallback ──
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Custom config handles client-side routing (BrowserRouter) + API proxy.
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
