# FlowForge Backend

Backend API for FlowForge built with NestJS, Prisma and PostgreSQL.

## Prerequisites

- Node.js 18+ (20 recommended)
- npm
- PostgreSQL (or use the provided Docker service)
- Redis (for queue/events)

## Run locally (without Docker)

1. Change into the backend folder:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Prepare your `.env` (create it if missing):

```env
DATABASE_URL="postgresql://postgres:root@localhost:5433/flowforge_app?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
OPENAI_API_KEY=
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
```

4. Run migrations and generate Prisma client:

```bash
npx prisma migrate dev
npx prisma generate
```

5. Start the backend in dev mode:

```bash
npm run start:dev
```

6. Verify health endpoint:

```bash
curl http://localhost:3001/auth/health
```

## Run with Docker (recommended)

From the project root:

```bash
./scripts/docker-dev.sh
```

The backend will be available at `http://localhost:3001`.

## Manual testing scripts

Run from the `backend/` folder:

```bash
node scripts/verify_phase1_3.js
node scripts/run_test_priority3.js
node scripts/ws_trigger_and_listen.js
```

Default API base used by the scripts: `http://localhost:3001`.
You can override endpoints via environment variables:

```bash
FLOWFORGE_API_BASE_URL=http://localhost:3001 node scripts/verify_phase1_3.js
FLOWFORGE_WS_URL=http://localhost:3001/ws node scripts/ws_trigger_and_listen.js
```

## Important scripts

- `npm run start:dev`: Start backend in watch mode (port 3001)
- `npm run build`: Build the backend
- `npm run start:prod`: Run the built app
- `npm run prisma:migrate`: Run Prisma migrations
- `npm run prisma:generate`: Generate Prisma client

## Quick troubleshooting

- DB connection errors: check `DATABASE_URL` and ensure PostgreSQL is running on the expected port.
- CORS issues from the frontend: ensure frontend runs at `http://localhost:3000` and backend at `http://localhost:3001`.
- Prisma type errors: run `npx prisma generate` and restart the backend.
- Manual script timeouts: ensure backend, Postgres, and Redis are all running.

See the root [README](../README.md) for workflow examples and full project documentation.
