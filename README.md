# Full-Stack Workflow Exercise — Starter

A starter repository for the full-stack engineering exercise. It gives you a
running React + TypeScript frontend and a runnable FastAPI backend so you can
spend your time on the problem — designing and building the workflow editor,
the API contract, validation, and persistence — rather than on project setup.

> **Read [`EXERCISE.md`](./EXERCISE.md) first.** It is the canonical brief.

## What's in the box

```
gui-starter/
├── EXERCISE.md          # the brief — read this first
├── frontend/            # React 19 · TypeScript · Vite · ReactFlow · Tailwind · Zustand · TanStack Query · Vitest
├── backend/             # FastAPI · Pydantic v2 · Poetry · pytest
├── docker-compose.yml   # optional: run the backend in a container
└── package.json         # optional: run both apps with one command
```

Each half has its own README with details:
[`frontend/README.md`](./frontend/README.md) and
[`backend/README.md`](./backend/README.md).

The starter is deliberately a **skeleton**: both apps run, compile, and have
passing tests, but the workflow endpoints, validation, editing operations, and
save/load wiring are stubbed with `TODO`s. That's the exercise. Everything here
is a starting point you're free to restructure — just explain material changes.

## Prerequisites

- **Node 20+** and npm (frontend)
- **Python 3.12+** and [Poetry](https://python-poetry.org/docs/#installation) (backend)

## Quick start

Run the two apps in separate terminals (recommended):

```bash
# Terminal 1 — backend  →  http://localhost:8000  (docs at /docs)
cd backend
poetry install
poetry run uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend  →  http://localhost:3000
cd frontend
npm install
npm run dev
```

### Optional: run both with one command

```bash
npm install          # installs `concurrently` and the API type watcher
npm run dev          # frontend, backend, and contract regeneration
```

(Assumes you've already run `poetry install` in `backend/` and `npm install` in
`frontend/`. The frontend dev server exports the OpenAPI schema before it
starts, so the backend Poetry environment has to be installed first.)

### Optional: backend in Docker

If you'd rather not install Python/Poetry:

```bash
docker compose up    # backend at http://localhost:8000
```

Then run the frontend with npm as above. Frontend dev and production builds
still export the OpenAPI schema locally, so Poetry and the backend
dependencies must be installed even when the API process runs in Docker.

## Running the tests

```bash
cd frontend && npm run test:run     # Vitest
cd backend  && poetry run pytest     # pytest
```

## Type alignment

Pydantic models in `backend/app/models.py` are the source of truth. The frontend
does not keep a second handwritten copy of the wire contract.

Generate the contract by hand with:

```bash
npm run generate:api
```

That exports OpenAPI without starting the server (`frontend/openapi/openapi.json`)
and writes TypeScript types (`frontend/src/api/generated.ts`). The same
generation runs automatically before `npm run dev` and `npm run build` in
`frontend/`. While the root `npm run dev` command is running, changes under
`backend/app/**/*.py` regenerate the contract. Vite reloads when the generated
TypeScript module changes.

`frontend/src/types/workflow.ts` aliases the persisted models from that
generated module. React Flow's editor types stay separate in
`frontend/src/features/workflow/flowTypes.ts`.

Do not edit `frontend/openapi/openapi.json` or `frontend/src/api/generated.ts`
by hand. Change the Pydantic models and regenerate.

Install the backend Poetry dependencies before a frontend dev server or
production build. Both export the schema first, and a missing environment
stops generation.

CI should regenerate and fail when the committed artifacts are stale:

```bash
npm run generate:api
git diff --exit-code -- frontend/openapi/openapi.json frontend/src/api/generated.ts
```
