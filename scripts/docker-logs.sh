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

# FlowForge Docker Logs
# Display logs from all services

set -e

echo "📋 Showing FlowForge logs (use Ctrl+C to exit)..."
echo ""

$COMPOSE_CMD logs -f
