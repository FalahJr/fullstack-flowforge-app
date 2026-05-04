docker-compose down -v
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

# FlowForge Docker Reset Database
# Removes all containers and volumes, then restarts

set -e

echo "🗑️  Resetting FlowForge database and containers..."
echo ""

# Stop and remove containers and volumes
$COMPOSE_CMD down -v

echo ""
echo "✅ Database and containers reset successfully!"
echo ""
echo "To restart, run:"
echo "   ./scripts/docker-dev.sh   (for development)"
echo "   ./scripts/docker-prod.sh  (for production)"
