# FlowForge Frontend

Frontend dashboard for FlowForge using Next.js + TypeScript.

## Features (MVP)

- Login and register
- Workflow list
- Create, delete, and trigger workflow runs
- Hybrid run monitoring:
  - Baseline via REST (`/workflows/:id/runs`, `/workflows/:id/runs/:runId`)
  - Realtime updates via WebSocket (`workflow.started`, `step.*`, `workflow.completed`)
- Display logs, errors, and AI hints

## Running locally

1. Ensure the backend is running at `http://localhost:3001`
2. Copy environment file:

```bash
cp .env.example .env.local
```

3. Install dependencies and start dev server:

```bash
npm install
npm run dev
```

4. Open `http://localhost:3000`.

## Reviewer notes

- Default frontend API endpoint: `http://localhost:3001`
- Workflows page: `http://localhost:3000/workflows`
- When running via Docker, follow the root README and use `./scripts/docker-dev.sh`

## Production build

```bash
npm run build
npm run start
```

## Key structure

- `src/app/(auth)` pages for login/register
- `src/app/(dashboard)/workflows` workflow list page
- `src/app/(dashboard)/workflows/[id]/runs/[runId]` run monitor page
- `src/services` API client, workflow service, and socket service
- `src/features` auth and workflow components

See the root [README](../README.md) for workflow examples and full project documentation.
