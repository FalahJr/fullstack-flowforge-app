docker-compose up --build
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

# FlowForge Docker Development Mode
# Starts backend, frontend, postgres, and redis with hot reload

set -e

echo "🚀 Starting FlowForge in development mode..."
echo ""

# Check if .env.docker exists
if [ ! -f ".env.docker" ]; then
        echo "⚠️  .env.docker not found, copying from .env.docker.example"
        cp .env.docker.example .env.docker
fi

# Start services
$COMPOSE_CMD up --build

echo ""
echo "✅ FlowForge development environment started!"
echo ""
echo "📍 Access points:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend:  http://localhost:3001"
echo "   - Database: localhost:5433"
echo "   - Redis:    localhost:6379"
