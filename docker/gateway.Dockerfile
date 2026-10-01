FROM node:24-bookworm-slim
WORKDIR /app

COPY package*.json ./
COPY apps/gateway/package.json ./apps/gateway/package.json
COPY packages ./packages
COPY apps/gateway ./apps/gateway

RUN npm ci --omit=dev

ENV NODE_ENV=production
ENV DESKTOP_MCP_GATEWAY_PORT=8790
ENV DESKTOP_MCP_DATA_DIR=/data

VOLUME ["/data"]
EXPOSE 8790

CMD ["node", "node_modules/tsx/dist/cli.mjs", "apps/gateway/src/index.ts"]
