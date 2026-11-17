# --- build ------------------------------------------------------------------
FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- runtime ----------------------------------------------------------------
FROM nginx:1.27-alpine
ENV PORT=8025 \
    LOCALSTACK_ENDPOINT=http://localstack:4566 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8025
