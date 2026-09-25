FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist/client ./dist/client
COPY --from=build /app/dist/railway ./dist/railway
EXPOSE 8080
CMD ["node", "dist/railway/server.mjs"]
