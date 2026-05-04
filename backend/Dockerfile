# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Development stage
FROM node:18-alpine AS development

WORKDIR /app

RUN apk add --no-cache postgresql-client

COPY package*.json ./
RUN npm ci

COPY . .
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npm", "run", "start:dev"]

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npm", "run", "start:prod"]
