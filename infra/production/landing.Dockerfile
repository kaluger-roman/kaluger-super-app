FROM node:20.19.5-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm ci
COPY next.config.ts postcss.config.mjs tsconfig.json ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM scratch AS export
COPY --from=build /app/out /
