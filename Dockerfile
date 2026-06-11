FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
RUN npm ci --workspace shared --workspace server

# Build shared and server
COPY shared/ ./shared/
COPY server/ ./server/
COPY tsconfig.json ./
RUN npm run build --workspace shared
RUN npm run build --workspace server

# Run stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/shared/dist ./shared/dist
COPY --from=base /app/server/dist ./server/dist
COPY --from=base /app/server/package.json ./server/package.json
COPY prisma/ ./prisma/

EXPOSE 5000
CMD ["node", "server/dist/index.js"]
