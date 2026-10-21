FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY studio-worker/package.json ./
RUN npm install --omit=dev
COPY studio-worker/src ./src
COPY shared /shared

ENV NODE_ENV=production \
    STUDIO_WORK_DIR=/tmp/ola-studio \
    STUDIO_POLL_INTERVAL_MS=4000

CMD ["node", "src/index.mjs"]
