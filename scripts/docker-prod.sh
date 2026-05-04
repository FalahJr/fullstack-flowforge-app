docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build
#!/bin/bash

# Detect compose command (docker compose v2 or docker-compose)
if command -v docker &> /dev/null && docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "Error: neither 'docker compose' nor 'docker-compose' found. Please install Docker." >&2
    exit 1
fi

# FlowForge Docker Production Mode
# Starts optimized production builds

set -e

echo "🚀 Starting FlowForge in production mode..."
echo ""

# Check if .env.docker exists
if [ ! -f ".env.docker" ]; then
        echo "⚠️  .env.docker not found, copying from .env.docker.example"
        cp .env.docker.example .env.docker
fi

# Start services with production compose
$COMPOSE_CMD -f docker-compose.yml -f docker-compose.prod.yml up --build

echo ""
echo "✅ FlowForge production environment started!"
echo ""
echo "📍 Access points:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend:  http://localhost:3001"
echo "   - Database: localhost:5433"
echo "   - Redis:    localhost:6379"
