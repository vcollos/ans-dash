FROM node:22-slim AS base
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/server ./server
COPY --from=base /app/db ./db
COPY --from=base /app/dist ./dist
COPY --from=base /app/package.json ./package.json

EXPOSE 8080
CMD ["node", "server/index.js"]
