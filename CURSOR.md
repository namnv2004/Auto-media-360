# Auto Media 360 Core Rules

This rule set defines core quality standards and boundaries for the Auto Media 360 (`ltlt`) project.

## 1. Core Quality Gates

- Keep TypeScript strict and avoid `any`.
- If `any` is unavoidable, add a short inline justification comment.
- No unused imports, variables, or function parameters.
- Keep deterministic import ordering.
- Keep lint, type-check, and build green after substantive changes.

## 2. Naming Conventions

### Frontend
- Folder names: `kebab-case` (e.g. `src/features/users-list/`)
- Component files: `PascalCase.tsx` (e.g. `index.tsx`, `UserCard.tsx`)
- Hook files: `useXxx.ts` / `useXxx.tsx`
- Types and interfaces: `PascalCase`
- Constants and constant object keys: `UPPER_SNAKE_CASE`

### Backend
- Directory names: `snake_case` (e.g., `api/src/video_engine`)
- Python files: `snake_case.py` (e.g., `routes.py`, `tasks.py`)
- Class names: `PascalCase`
- Variable & function names: `snake_case`

## 3. Boundaries & Structure

### Backend (FastAPI + Celery)
- **`api/main.py`**: Entry point of the FastAPI application. Do not bloat this file.
- **`api/core/`**: Houses global configurations (database, celery, middleware, logging, exceptions).
- **`api/src/<feature>/`**: Domain-specific logic. Keep route definitions in `routes.py`, background processing tasks in `tasks.py`, and validation/Pydantic schemas in `schemas.py`.

### Frontend (React + TanStack Router + Tailwind v4)
- **`src/routes/`**: Focused strictly on routing, layouts, and route entry points.
- **`src/features/`**: Group all business components, feature-specific data hooks, and stores here. Do not place business logic in `src/routes/`.
- **`src/components/ui/`**: Pure UI elements (Shadcn primitives). They must be completely decoupled from business/domain models.

## 4. UI Color System

- Always use CSS variables from `theme.css` / `index.css` for styling.
- Never use arbitrary Tailwind color values (e.g., `bg-blue-500`, `text-red-600`). Use semantic tokens like `bg-primary`, `text-foreground`, `border-border`, etc.
- If a new color is needed, add it to the CSS variables in `theme.css` first, then reference it via Tailwind's theme config/variants.

### Local Run & Hot Reload
```bash
docker compose up --watch
```

### Backend
```bash
# From /backend
uv run pytest
```

### Frontend
```bash
# From /frontend
pnpm run lint
pnpm run build
pnpm run test
```

## 6. Specialized Agent Rules

This project includes specialized agent instructions under `.cursor/rules/`:
- **`backend-engineer.mdc`**: Guided rules for python/FastAPI routes, tasks, and SQLAlchemy async models.
- **`frontend-engineer.mdc`**: Guided rules for React 19, `@tanstack/react-router`, Zustand, and Tailwind v4.
- **`reviewer.mdc`**: Review guidelines for architectural consistency, security, and tests.
- **`debugger.mdc`**: Guidelines for root-cause analysis and debugging errors.
- **`devops-engineer.mdc`**: Rules for managing container-based infrastructure.

