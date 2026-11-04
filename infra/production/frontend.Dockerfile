FROM node:20-bookworm-slim AS build
WORKDIR /app
ENV CI=false
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY nginx.production.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/build /usr/share/nginx/html
ENV NGINX_ENVSUBST_FILTER=TRUSTED_PROXY_IP
