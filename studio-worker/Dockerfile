# syntax=docker/dockerfile:1.7

FROM debian:bookworm-slim AS whisper-builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates cmake g++ git make \
  && rm -rf /var/lib/apt/lists/*
ADD https://github.com/ggml-org/whisper.cpp/archive/refs/tags/v1.7.5.tar.gz /tmp/whisper.cpp.tar.gz
RUN mkdir -p /src \
  && tar -xzf /tmp/whisper.cpp.tar.gz --strip-components=1 -C /src \
  && cmake -S /src -B /src/build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_EXAMPLES=ON \
  && cmake --build /src/build --config Release --target whisper-cli -j2

FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core ca-certificates libgomp1 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=whisper-builder /src/build/bin/whisper-cli /usr/local/bin/whisper-cli
RUN mkdir -p /opt/whisper
ADD --checksum=sha256:be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21 https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin /opt/whisper/ggml-tiny.bin

WORKDIR /app
COPY studio-worker/package.json ./
RUN --mount=type=secret,id=avg_web_shield_ca \
  NODE_EXTRA_CA_CERTS=/run/secrets/avg_web_shield_ca npm install --omit=dev
COPY studio-worker/src ./src
COPY studio-worker/scripts ./scripts
COPY studio-worker/test ./test
COPY shared /shared

ENV NODE_ENV=production \
    STUDIO_WORK_DIR=/tmp/ola-studio \
    STUDIO_POLL_INTERVAL_MS=4000 \
    STUDIO_WHISPER_PATH=/usr/local/bin/whisper-cli \
    STUDIO_WHISPER_MODEL=/opt/whisper/ggml-tiny.bin \
    STUDIO_WHISPER_THREADS=2

CMD ["node", "src/index.mjs"]
