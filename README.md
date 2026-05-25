# AUTO MEDIA 360 🎥

A high-performance, automated video production system built with FastAPI, Celery, PostgreSQL, Redis, and React/Vite — designed to automatically crawl news, rewrite scripts using AI, and fetch media from YouTube/TikTok APIs.

## Architecture Overview 🏗️

```
[Browser / Internal User]
        │  POST /api/video/generate { keyword: "tech news" }
        ▼
[FastAPI Backend]  ──────────────────────────────────────────────────
        │  Saves to PostgreSQL (status: pending)
        │  celery_app.send_task("tasks.generate_video")
        ▼
[Celery Worker]  (runs in background)
        │  1. Call OpenAI SDK to rewrite script
        │  2. Call YouTube/TikTok API for media sources
        │  3. Mix video logic (Flow API / FFmpeg)
        │  4. Update PostgreSQL status
        ▼
[PostgreSQL]  (Stores users, scripts, media links)
        │
        ▼
[FastAPI WebSockets]  ──  Push Realtime Progress (10%, 50%, 100%) to Frontend
```

## Project Structure 📁

```
automedia360/
├── backend/                        # Python / FastAPI / Celery
│   ├── alembic/                    # Database migrations
│   ├── api/
│   │   ├── main.py                 # FastAPI application entry point
│   │   └── routes/                 # API Endpoints
│   ├── core/
│   │   ├── config.py               # Environment variables
│   │   ├── celery_app.py           # Celery configuration
│   │   └── database.py             # PostgreSQL connection
│   ├── database/                   # SQLAlchemy Models
│   ├── tasks/                      # Celery Tasks (AI, Crawl)
│   ├── pyproject.toml              # uv dependencies
│   └── Dockerfile.dev              # Backend Docker image
│
├── frontend/                       # React / Vite SPA
│   ├── src/
│   │   ├── components/             # Shadcn UI / React components
│   │   ├── store/                  # Zustand state management
│   │   └── App.tsx                 # Main Split-view layout
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile.dev              # Frontend Docker image
│
├── docker-compose.yml              # Local Full-stack (Auto-reload)
├── .env.example                    # Environment variables template
└── README.md                       # This file
```

## Requirements 📋

- Python 3.12+ (Using `uv`)
- Node.js 20+
- Docker & Docker Compose
  - **Windows Setup**: If Docker Desktop is not installed, install it using Winget (native Windows Package Manager):
    ```powershell
    # Install WSL 2 (requires computer restart if newly installed)
    wsl --install

    # Install Docker Desktop
    winget install Docker.DockerDesktop
    ```
- PostgreSQL 16
- Redis 7

## Setup and Installation 🛠️

### Using Docker Compose (Full Stack — Recommended for Local Dev)

Spin up the entire stack (API + Worker + Frontend + DB + Redis) with native auto-reload using Compose Watch:
```bash
docker compose up --watch
```

Services exposed:
| Service    | Port  | Description                     |
|------------|-------|---------------------------------|
| Frontend   | 5173  | Vite React App                  |
| Backend    | 8000  | FastAPI Server                  |
| Database   | 5432  | PostgreSQL 16                   |
| Redis      | 6379  | Celery Broker / Cache           |

### Manual Local Setup (Backend)

We use [uv](https://github.com/astral-sh/uv) as the blazing-fast Python package manager.

1. Install uv:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

2. Go to backend and install dependencies:
```bash
cd backend
uv pip install -r pyproject.toml
```

3. Run FastAPI manually:
```bash
uvicorn api.main:app --reload
```

4. Run Celery Worker manually:
```bash
celery -A core.celery_app worker --loglevel=info
```

### Manual Local Setup (Frontend)

```bash
cd frontend
npm install
npm run dev
```

## Environment Setup 🌍

Copy `.env.example` to `.env` inside `backend/` and configure your keys:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/automedia
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=sk-...
YOUTUBE_API_KEY=...
TIKTOK_API_KEY=...
```

## Development Tools 🔧

- **Frontend Styling:** Tailwind CSS + Shadcn UI
- **State Management:** Zustand
- **Backend Lint/Format:** Ruff (recommended)
- **Migrations:** Alembic

## AI Guidelines 🤖

For AI coding assistants working on this project, please refer to the following guide files for required skills, coding rules, and conventions:
- [AGENTS.md](AGENTS.md): Setup, skills, and directory structure rules.
- [CLAUDE.md](CLAUDE.md): General AI behavior rules (Think Before Coding, Simplicity First, Surgical Changes).
- [CURSOR.md](CURSOR.md): Specific rules for Cursor IDE (boundaries, naming conventions, color system, and verification steps).
