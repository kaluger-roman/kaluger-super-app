FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# The runtime includes pg_dump 16, matching the database and recovered dumps.
# Retain Prisma's CLI for explicit migrations; startup never mutates the schema.
FROM postgres:16-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates libstdc++6 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1000 app && useradd --uid 1000 --gid 1000 --no-create-home app
COPY --from=build /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
RUN mkdir backups && chown app:app backups
USER app
ENV NODE_ENV=production PORT=3001 HOST=0.0.0.0
ENTRYPOINT []
CMD ["node", "dist/index.js"]
