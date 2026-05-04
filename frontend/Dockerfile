# Development stage
FROM node:18-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

ENV NEXT_PUBLIC_API_URL=http://localhost:3001

CMD ["npm", "run", "dev"]

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

ENV NEXT_PUBLIC_API_URL=http://backend:3001
ENV NODE_ENV=production

CMD ["npm", "run", "start"]
