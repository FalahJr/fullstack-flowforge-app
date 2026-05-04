#!/bin/sh

# Docker entrypoint for backend
# Handles database migrations and starts the application

set -e

echo "⏳ Waiting for database to be ready..."

# Wait for postgres to be available (30 attempts, 1 second interval)
ATTEMPTS=0
MAX_ATTEMPTS=30
until [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; do
  if PGPASSWORD="${POSTGRES_PASSWORD:-root}" psql -h postgres -U postgres -d postgres -c "SELECT 1" > /dev/null 2>&1; then
    break
  fi
  ATTEMPTS=$((ATTEMPTS + 1))
  echo "  Attempt $ATTEMPTS/$MAX_ATTEMPTS: Retrying in 1 second..."
  sleep 1
done

if [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; then
  echo "❌ Failed to connect to database after $MAX_ATTEMPTS attempts"
  exit 1
fi

echo "✅ Database is ready!"
echo ""

echo "🔄 Running Prisma migrations..."
npx prisma migrate deploy || npx prisma migrate dev --skip-generate

echo "🔄 Regenerating Prisma client..."
npx prisma generate

echo "✅ Migrations completed!"
echo ""

echo "🚀 Starting backend..."
exec "$@"
