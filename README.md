# Workflow editor

A React and FastAPI app for creating, validating, saving, and retrieving a machine-learning workflow graph. The brief is [`EXERCISE.md`](./EXERCISE.md).

## Running the solution

Run these commands from the **repository root**. That is the primary way to run the app, and it is the way that gets everything working: the editor, the API, and regeneration of the TypeScript contract when the Python models change.

### Prerequisites

- Node 22 (pinned in `.nvmrc`) and npm
- Python 3.12+ and [Poetry](https://python-poetry.org/docs/#installation)

### Install

From the repository root:

```bash
npm run install:all
```

That installs the root tooling, the frontend dependencies, and the backend Poetry environment.

### Start

From the repository root, after `install:all`:

```bash
npm run dev
```

- Editor: `http://localhost:3000`
- API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

`npm run dev` starts all three processes. It watches `backend/app/**/*.py` and regenerates the contract when those files change. A frontend dev server or production build also exports the OpenAPI schema before it starts, so the Poetry environment from `install:all` has to be in place first.

Optional: `docker compose up` runs the API in a container at `http://localhost:8000`. The editor still runs with npm, and it still needs Poetry installed locally because it exports the schema before it starts.

### Environment variables

Copy the examples if you want to override the defaults. Both already match a local run.

| App | File | Variable | Default |
| --- | --- | --- | --- |
| Frontend | `frontend/.env.example` | `VITE_API_BASE_URL` | `http://localhost:8000` |
| Backend | `backend/.env.example` | `ALLOWED_ORIGINS` | `["http://localhost:3000"]` |

### Tests

```bash
cd frontend && npm run test:run
cd backend  && poetry run pytest
```

### Create, save, and retrieve in the editor

Open `http://localhost:3000`. A fresh API process loads one example pipeline, **Load, transform, train** (`example-pipeline`): DataSource, Transform, and Model, already connected.

The **Workflows** menu lists saved workflows. **New workflow** asks for a name and creates an empty one. Choosing a name in that menu loads it from the API.

Edits save on their own. Moving a node waits briefly, then saves. The toolbar shows Loading, Saving, Saved, Server unavailable (the API could not be reached), or Missing (the workflow is gone). The mark beside the title is the validation of the document just returned. Restarting the API clears everything except the example pipeline.

### Example API requests

Interactive docs: `http://localhost:8000/docs`. The wire format is camelCase. Create and replace return the stored workflow plus its validation. The server assigns `id` and `status`.

```bash
curl http://localhost:8000/health

# The pipeline loaded at startup
curl http://localhost:8000/workflows/example-pipeline

# A workflow that does not exist → 404
curl -i http://localhost:8000/workflows/missing

curl -X POST http://localhost:8000/workflows \
  -H 'Content-Type: application/json' \
  -d '{"name":"My workflow","nodes":[],"edges":[]}'
```

`PUT /workflows/{workflow_id}` replaces the whole document. `GET /workflows` lists summaries. `DELETE /workflows/{workflow_id}` removes one. A body that does not match the schema returns 422 and is not stored.

## Decisions, time spent and trade-offs

I completed this challenge over several days, first day I read and understood the exercise, got a mental map of what I wanted to do and implemented the type generation as a first step. The second day I focused on the backend with some light frontend changes for testing, the final day I spent polishing the fronted and writing up. 

I think my biggest compromise, or at least the one I would worry about leaving, is the two points of truth on the validation in the front and backend, I feel these are likely to drift and would be a breeding ground for bugs later down the line. While there are some features that still would need to be implemented, this feels the most likely to add tech debt.

See [`DECISIONS.md`](./DECISIONS.md) for a full list of decisions made.


## AI-assisted development

- I used ChatGPT to brainstorm/rubber duck with about the exercise
- I used Cursor for the implementation, leveraging plan mode for the bigger changes, agent for smaller features/changes and debug for debugging. 
- I reviewed the changes made by AI in IDE file by file, checking the changes manually myself through the browser. I also asked it to do a bug sweep through the IDE browser once finished in case I missed anything.
- Validation and store layout were the areas I had biggest to and fro, otherwise my premade settings guided the AI to code in my prefferred style. 

