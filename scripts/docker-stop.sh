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

# FlowForge Docker Stop
# Gracefully stops all containers

set -e

echo "⏹️  Stopping FlowForge services..."
echo ""

$COMPOSE_CMD stop

echo ""
echo "✅ Services stopped successfully!"
echo ""
echo "To restart, run:"
echo "   $COMPOSE_CMD start"
