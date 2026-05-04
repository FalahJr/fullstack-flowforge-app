# 🚀 FlowForge — Workflow Orchestration Engine

A full-stack workflow orchestration system that executes workflows as DAG (Directed Acyclic Graph), similar to Zapier and GitHub Actions.

---

## ⚡ Quick Start with Docker

### Development Mode (with hot reload)

```bash
# Start all services (backend, frontend, PostgreSQL, Redis)
./scripts/docker-dev.sh

# Access:
# - Frontend: http://localhost:3000
# - Backend:  http://localhost:3001
```

### Production Mode

```bash
./scripts/docker-prod.sh
```

### Useful Commands

```bash
./scripts/docker-logs.sh      # View logs
./scripts/docker-stop.sh      # Stop services
./scripts/docker-reset.sh     # Reset database & containers
```

---

## 📚 Full Documentation

- **[🐳 Docker Setup Guide](./DOCKER_SETUP.md)** — Detailed Docker configuration & commands
- **[🧠 Backend Guide](./backend/CLAUDE.md)** — Backend architecture & development
- **[🎨 Frontend Guide](./frontend/CLAUDE.md)** — Frontend structure & UI guidelines

---

## 🏗️ Architecture

### Tech Stack

- **Backend**: NestJS + TypeScript
- **Frontend**: Next.js + React + TailwindCSS
- **Database**: PostgreSQL
- **Cache/Queue**: Redis + BullMQ
- **Real-time**: Socket.io
- **ORM**: Prisma

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                     │
│              Dashboard • Workflow Builder • Logs             │
│                      (Port 3000)                             │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP + WebSocket
┌────────────────▼────────────────────────────────────────────┐
│                   Backend (NestJS)                          │
│  Auth • Workflows • Engine • Queue • WebSocket • AI         │
│                      (Port 3001)                             │
└───┬──────────────────┬──────────────────────────┬───────────┘
    │                  │                          │
┌───▼─────────────────▼──────────────────────────▼──────┐
│                   Services                            │
│  PostgreSQL (5433) • Redis (6379)                     │
└──────────────────────────────────────────────────────┘
```

---

## 📦 Project Structure

```
flowforge/
├── backend/                    # NestJS backend
│   ├── src/
│   │   ├── auth/              # Authentication
│   │   ├── workflows/         # Workflow management
│   │   ├── workflow-engine/   # DAG execution
│   │   ├── queue/             # BullMQ integration
│   │   ├── websocket/         # Real-time events
│   │   └── ...
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── Dockerfile             # Multi-stage build
│   └── package.json
│
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── app/               # Next.js app router
│   │   ├── components/        # React components
│   │   ├── services/          # API & socket clients
│   │   └── ...
│   ├── Dockerfile             # Multi-stage build
│   └── package.json
│
├── docker-compose.yml         # Development setup
├── docker-compose.prod.yml    # Production setup
├── .env.docker                # Environment config
├── scripts/
│   ├── docker-dev.sh          # Start development
│   ├── docker-prod.sh         # Start production
│   ├── docker-reset.sh        # Reset database
│   └── ...
└── DOCKER_SETUP.md            # Docker documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Docker** v20.10+
- **Docker Compose** v2.0+
- **Git**

### Installation

1. **Clone repository**

   ```bash
   git clone <repository-url>
   cd flowforge
   ```

2. **Start with Docker**

   ```bash
   ./scripts/docker-dev.sh
   ```

3. **Access applications**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

4. **(Optional) Manual Setup** without Docker:
   - See [Backend Guide](./backend/README.md)
   - See [Frontend Guide](./frontend/README.md)

---

## 🎯 Core Features

### Workflow Engine

- Define workflows as DAG
- Validate structure (no cycles)
- Execute steps based on dependencies
- Parallel execution where possible
- Retry with exponential backoff

### Queue System

- Redis-backed BullMQ
- Async job processing
- Automatic retry handling
- Step-based execution

### Real-time Monitoring

- WebSocket events for step execution
- Live status updates
- Execution logs streaming
- Multi-tenant isolation

### Multi-Tenant Support

- Isolated data per tenant
- JWT-based authentication
- Role-based access control

### AI-Powered Failure Analysis

- Capture step errors
- Send to AI service
- Return debug suggestions

---

## 📝 Development

### Backend Development

```bash
# Inside backend container
npm run start:dev        # Start with watch mode
npm run prisma:migrate  # Run migrations
npm run prisma:generate # Generate Prisma client
npm run build           # Build for production
```

### Frontend Development

```bash
# Inside frontend container
npm run dev             # Start dev server
npm run build           # Build for production
npm run start           # Start production server
```

### Database Management

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d flowforge_app

# View database with Prisma Studio
docker-compose exec backend npx prisma studio
```

---

## 🧪 Testing

### Manual Testing

1. Start Docker stack: `./scripts/docker-dev.sh`
2. Register user at http://localhost:3000/register
3. Login at http://localhost:3000/login
4. Create a workflow
5. Trigger execution
6. Monitor real-time updates

### Example Workflow

```json
{
  "name": "Simple Workflow",
  "steps": [
    {
      "id": "step1",
      "type": "http",
      "config": {
        "url": "https://jsonplaceholder.typicode.com/posts/1",
        "method": "GET"
      },
      "next": ["step2"]
    },
    {
      "id": "step2",
      "type": "delay",
      "config": {
        "ms": 2000
      },
      "next": []
    }
  ]
}
```

---

## 🔧 Configuration

### Environment Variables

See [`.env.docker.example`](./.env.docker.example) for all available options.

Key variables:

- `DATABASE_URL` — PostgreSQL connection
- `REDIS_HOST` — Redis server
- `JWT_SECRET` — JWT signing key
- `OPENAI_API_KEY` — OpenAI API key (optional)

---

## 📊 Monitoring & Logs

### View Logs

```bash
./scripts/docker-logs.sh      # All services
docker-compose logs -f backend   # Backend only
docker-compose logs -f frontend  # Frontend only
```

### Database Inspection

```bash
# Prisma Studio (visual database explorer)
docker-compose exec backend npx prisma studio

# PostgreSQL shell
docker-compose exec postgres psql -U postgres -d flowforge_app
```

---

## 🚨 Troubleshooting

### Common Issues

| Issue                      | Solution                                                      |
| -------------------------- | ------------------------------------------------------------- |
| Services won't start       | Run `docker-compose down -v` then `docker-compose up --build` |
| Port already in use        | Kill process or change port in `.env.docker`                  |
| Database connection failed | Check `.env.docker` DATABASE_URL                              |
| Hot reload not working     | Rebuild: `docker-compose up --build`                          |

See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for more troubleshooting.

---

## 🧹 Cleanup

```bash
# Stop services (keep data)
./scripts/docker-stop.sh

# Remove services (keep data)
docker-compose down

# Full reset (remove everything)
./scripts/docker-reset.sh
```

---

## 📚 Documentation

- [🐳 Docker Setup Guide](./DOCKER_SETUP.md)
- [🧠 Backend Architecture](./backend/CLAUDE.md)
- [🎨 Frontend Guidelines](./frontend/CLAUDE.md)
- [⚙️ Workflow Engine Docs](./backend/docs/workflow-engine.md)

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Open pull request

---

## 📄 License

This project is part of a technical assessment.

---

## 🎯 Roadmap

- [ ] Advanced DAG visualization with React Flow
- [ ] Workflow versioning & rollback
- [ ] Advanced retry strategies (circuit breaker)
- [ ] Workflow scheduling (cron expressions)
- [ ] Integration marketplace
- [ ] Mobile app
- [ ] Kubernetes deployment

---

## 📞 Support

For issues, questions, or feedback:

1. Check [DOCKER_SETUP.md](./DOCKER_SETUP.md) troubleshooting section
2. Review [Backend Guide](./backend/CLAUDE.md)
3. Check application logs: `./scripts/docker-logs.sh`

---

**Last Updated**: May 4, 2026
