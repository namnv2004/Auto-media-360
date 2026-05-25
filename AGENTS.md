# AGENTS.md — Auto Media 360

Short guide for AI coding agents when working in this repository.

## 1. Required Skills

Skills are installed under `.agents/skills/` or globally. **Must** load when a task touches the domains listed below:

| Skill | When to use |
|---|---|
| `fastapi-clean-architecture` | Writing/refactoring Python/FastAPI code (routes, services, repositories, schemas, models). |
| `migration-safety` | When creating or modifying Alembic migrations, database schemas, or PostgreSQL models. |
| `debugging-and-error-recovery` | When tests fail, build breaks, or runtime errors are encountered (Celery worker, WebSockets, backend exceptions). |
| `modern-web-guidance` | Mandatory first execution for all frontend tasks (React 19, Tailwind CSS v4, Zustand, TanStack Router) to follow the latest best practices. |
| `impeccable` | Designing, optimizing, animating, or tweaking UI (Tailwind v4, Shadcn components, responsive layout). |
| `browser-testing-with-devtools` | Testing UI in a real browser using Chrome DevTools MCP (DOM, console, network, performance). |
| `devops-kubernetes` | When editing `docker-compose.yml`, `Dockerfile.dev`, or configuring containers for Redis/PostgreSQL. |
| `incremental-implementation` | Any large feature or change touching 2 or more files (split work and complete incrementally). |

> Before coding, read `SKILL.md` of the relevant skill. Do not make up rules.

## 2. Directory Conventions — Code in the Right Place

### 2.1 Backend (FastAPI + Celery + SQLAlchemy)
```
backend/
├── alembic/                # DB migrations (Alembic)
├── api/
│   ├── main.py             # Entrypoint of the FastAPI app
│   ├── core/               # Shared configuration (database.py, celery_app.py, exceptions, middleware, logging)
│   ├── src/                # Business logic separated by modules
│   │   ├── <feature>/
│   │   │   ├── routes.py   # API endpoints (APIRouter)
│   │   │   ├── tasks.py    # Celery tasks running in the background
│   │   │   ├── schemas.py  # Pydantic schemas (Request / Response validation)
│   │   │   └── models.py   # SQLAlchemy models (if any)
│   └── utils/              # Auxiliary utilities (migrations, helpers)
```
**Backend processing flow:**
```
FastAPI Router (routes.py)  →  Celery Task (tasks.py)  →  SQLAlchemy (models.py)  →  Database
```

### 2.2 Frontend (React + Vite + TanStack Router + Tailwind v4)
```
frontend/
├── src/
│   ├── routes/             # Route configurations using @tanstack/react-router (declare layouts & Page component only)
│   ├── features/           # Contains business logic and UI by feature (users, tasks, chats, settings, dashboard)
│   │   ├── <feature>/
│   │   │   ├── data/       # API fetches, React Query hooks, schemas
│   │   │   ├── components/ # Specific components for the feature
│   │   │   └── index.tsx   # Smart component/Main container of the feature
│   ├── components/
│   │   ├── ui/             # Shadcn primitives (dumb components, containing no business logic)
│   │   ├── layout/         # App layouts, Sidebar, TopNav, Header
│   │   └── data-table/     # Reusable elements for Table
│   ├── stores/             # Zustand stores for local state
│   ├── hooks/              # Shared custom React hooks (use-mobile, use-dialog-state)
│   ├── styles/             # Stylesheet (index.css using @import 'tailwindcss', theme.css defining css variables)
│   └── lib/                # Helpers, utilities (utils.ts, cookies.ts)
```

## 3. Main Development Rules

### 3.1 Backend
- **Package Manager**: Use `uv`.
- **Database Migrations**: When changing models, always run `alembic revision --autogenerate -m "description"` and verify safety via the `migration-safety` skill.
- **Linter/Formatter**: Use Ruff.

### 3.2 Frontend
- **Package Manager**: Use `pnpm`.
- **Routing**: Use `@tanstack/react-router`. When adding a new page, create the corresponding route under `src/routes/` and run `pnpm dev` to automatically generate `routeTree.gen.ts`.
- **State Management**: Use Zustand for client state and TanStack Query (`@tanstack/react-query`) for server state.
- **Styling**: Use Tailwind CSS v4. Do not write hardcoded color values directly (e.g., `bg-blue-500`), instead use CSS variables from `theme.css` via Tailwind tokens (e.g., `bg-primary`, `text-foreground`).
- **TypeScript**: Strict mode is mandatory, do not use `any`. Declare interfaces/types clearly.

### 3.3 Running Local & Auto-Reload
- **Local Dev Server**: Use `docker compose up --watch` to run and automatically update new code for backend, frontend, and celery worker during development.
- **Installing Docker on Windows**: If the development machine runs Windows and does not have Docker yet, coding agents must automatically execute the installation (or guide and request the user to run it if higher Administrator privileges are required) using the following PowerShell commands to configure WSL 2 and Docker Desktop:
  ```powershell
  wsl --install
  winget install Docker.DockerDesktop
  ```

## 4. Git & Commit Rules (Git Workflow Rules)

All coding agents and developers must adhere to the following Git process:

### 4.1 Branch Naming Rules (Branching)
Never develop features or fix bugs directly on the `master`/`main` branch. You must checkout a new branch from `master` before making any changes using the syntax:
* `feat/<feature-name>`: Add new features (e.g., `feat/login-page`).
* `fix/<bug-name>`: Fix bugs (e.g., `fix/api-timeout`).
* `chore/<task-name>`: Update configurations, README, libraries (e.g., `chore/update-readme`).

### 4.2 Commit Message Rules (Commit Messages)
Use the Conventional Commits format to record change history clearly:
```text
<type>: <short description in English or Vietnamese>
```
* **feat**: New feature.
* **fix**: Bug fix.
* **chore**: System maintenance, configuration.
* **docs**: Writing or updating documentation.

Example: `feat: add email notification functionality`, `fix: resolve memory leak issue`.

## 5. Prohibitions
- ❌ Hardcode API URLs, credentials, or secret keys.
- ❌ Write complex business logic directly in route definition files (`src/routes/`). All business logic and large UI components must be placed in `src/features/`.
- ❌ Add new dependencies without consulting the user.
- ❌ Arbitrarily change the codebase without corresponding unit tests.
- ❌ Commit directly to the `master` or `main` branch (except for minor rule configuration changes requested directly by the user).
