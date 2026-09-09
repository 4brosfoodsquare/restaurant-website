# Container image for the 4 Bros Food Square API.
#
# Two stages, because better-sqlite3 is a native module: the first stage has a
# C++ toolchain available in case npm has to compile it from source (it falls
# back to that whenever no prebuilt binary matches the platform), and the
# second copies only the finished node_modules. The toolchain never ships in
# the running image.

FROM node:22-bookworm-slim AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
# --omit=dev: the API needs none of the test or lint tooling at runtime.
RUN npm ci --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
# Fly routes to this port by convention; config/env.js reads PORT.
ENV PORT=8080

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Run as the image's unprivileged user. The mounted volume is chowned to it at
# start, since Fly attaches volumes owned by root.
EXPOSE 8080
CMD ["sh", "-c", "mkdir -p \"$(dirname \"$DATABASE_FILE\")\" \"$UPLOAD_DIR\" && npm run db:migrate && npm run db:seed && npm start"]
