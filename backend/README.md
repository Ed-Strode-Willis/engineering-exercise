# Backend — Workflow API (FastAPI)

A deliberately small FastAPI starter. It **boots, is CORS-enabled for the
frontend, and has a passing test suite** — but the workflow endpoints are
stubs. Designing and building persistence and validation is the exercise (see
[`../EXERCISE.md`](../EXERCISE.md), sections C3–C6).

## Prerequisites

- Python **3.12+**
- [Poetry](https://python-poetry.org/docs/#installation)

> Rather not install Python locally? A containerised path is provided — see
> [_Docker (optional)_](#docker-optional).

## Install & run

```bash
cd backend
poetry install
poetry run uvicorn app.main:app --reload --port 8000
```

- API root: `http://localhost:8000`
- Interactive docs (Swagger UI): `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health` → `{"status": "ok"}`

## Test

```bash
poetry run pytest
```

The suite covers the health check and the current (not-yet-implemented)
behaviour of the workflow endpoints. Replace the workflow tests as you build.

## What's provided vs. what's yours

**Provided (so you don't spend time on setup):**

- A runnable FastAPI app (`app/main.py`) with CORS configured for the Vite dev
  server (`app/config.py`).
- Starting Pydantic models (`app/models.py`). These are the authoritative API
  contract and are serialised as camelCase on the wire. The frontend generates
  its TypeScript types from the OpenAPI schema.
- Stubbed workflow routes (`app/routers/workflows.py`) returning `501` and a
  not-implemented `ValidationResult`, with a `# TODO` at each decision point.
- A health route and a green test suite.

**Yours to design and build:**

- Persistence — in-memory, file, or SQLite (§C3).
- Full-workflow validation returning structured diagnostics (§C4). Consider a
  pure module, independent of the web layer, so it's easy to test.
- Failure/`404` behaviour and error responses (§C5).
- The concurrent-update decision, written up in the README (§C6).

Everything here is a starting point — change the schema, restructure the app,
swap tooling. The Pydantic models are the source of truth: after a contract
change, regenerate the frontend types (see the root README). Do not edit the
generated OpenAPI or TypeScript files by hand.

## OpenAPI export

`scripts/export_openapi.py` imports the FastAPI app and writes `app.openapi()`
to `frontend/openapi/openapi.json`. It does not start a server, and it resolves
paths from the script file rather than the current working directory.

```bash
poetry run python scripts/export_openapi.py
```

From the repo root, `npm run generate:api` runs that export and then
`openapi-typescript`. Frontend `dev` and `build` do the same before they start,
so this Poetry environment must be installed first. The root `npm run dev`
command also watches `backend/app/**/*.py` and regenerates when those files
change. Production builds do not watch.

The stubbed workflow routes document and return a `501` `ValidationResult`, so
`ValidationIssue` and `ValidationResult` are part of the exported schema.

## Example requests

```bash
# Health
curl http://localhost:8000/health

# Create a workflow (currently returns 501 — implement POST /workflows)
curl -X POST http://localhost:8000/workflows \
  -H 'Content-Type: application/json' \
  -d '{"name":"My workflow","nodes":[],"edges":[]}'
```

## Layout

```
backend/
├── app/
│   ├── main.py            # FastAPI app + CORS + router registration
│   ├── config.py          # settings (allowed CORS origins)
│   ├── models.py          # Pydantic domain models (the wire contract)
│   └── routers/
│       ├── health.py      # GET /health
│       └── workflows.py   # POST/GET/PUT /workflows  (stubbed — build these)
├── tests/                 # pytest + FastAPI TestClient
├── pyproject.toml         # Poetry project + dev tooling (pytest, black, flake8)
└── Dockerfile             # optional containerised run
```

## Docker (optional)

From the repo root, `docker compose up` builds and runs this backend in a
container (handy if you'd rather not install Python/Poetry). The frontend still
runs with npm. See the root `README.md`.
