# Engineering Exercise Decision Log

This file records the product and technical decisions made while completing the
exercise. Each entry captures the reasoning, trade-offs, and consequences so the
implementation can be explained clearly during review.

## D001 — Generate frontend API types from the backend contract

**Status:** Accepted

### Context

The starter defines the workflow contract twice: as Pydantic models in the
FastAPI backend and as handwritten TypeScript types in the React frontend. If
both copies are edited independently, they can drift and allow incorrect
assumptions at the API boundary.

React Flow also has its own node and edge representations. Those objects contain
editor-specific data and should not become the persisted API contract.

### Decision

- Treat the FastAPI/Pydantic models as the authoritative API contract.
- Export FastAPI's OpenAPI schema without requiring a running server.
- Generate TypeScript API types from that schema with `openapi-typescript`.
- Regenerate types before frontend development and production builds.
- During development, watch backend application files and regenerate the types
  automatically when the API contract changes.
- Commit the exported OpenAPI schema and generated TypeScript file, but never
  edit either generated artifact manually.
- Keep React Flow-specific types separate and use explicit conversion functions
  between editor state and the persisted workflow model.

### Rationale

This creates one source of truth, makes backend contract changes visible as
frontend type errors, and prevents React Flow implementation details from
leaking into saved workflow data. It also demonstrates the optional schema
alignment extension without introducing GraphQL or duplicating runtime schemas.

### Consequences and trade-offs

- Frontend development and builds require the backend Poetry environment to be
  installed so the schema can be exported.
- A broken backend import or invalid model will stop type generation, surfacing
  the problem early.
- Generated TypeScript types provide compile-time safety, while Pydantic remains
  responsible for runtime request validation.
- Contract changes require regeneration; the development watcher and pre-build
  step reduce the chance of stale generated files.

### Implementation

- `backend/scripts/export_openapi.py` imports `app` from `app.main`, calls
  `app.openapi()`, and writes indented, key-sorted JSON to
  `frontend/openapi/openapi.json`. Paths are resolved from `__file__`. The
  script adds the backend root to `sys.path` so the import works from any
  working directory, and it does not start Uvicorn.
- FastAPI only publishes models that a route references. The stubbed workflow
  routes return `501` with a `ValidationResult`, so `ValidationIssue` and
  `ValidationResult` are included in `app.openapi()` without a separate app.
- `frontend` `generate:api` exports that document, then runs `openapi-typescript`
  into `src/api/generated.ts`. The generator is invoked with
  `--default-non-nullable false` so properties that have defaults but are absent
  from the OpenAPI `required` array stay optional. `predev` and `prebuild` run
  generation, so `npm run dev` and `npm run build` regenerate first.
- The root `dev` script runs the frontend, the backend, and `chokidar-cli`
  together. The watcher observes `backend/app/**/*.py` only and reruns the root
  `generate:api` command. It does not watch the generated frontend files, so
  writing them cannot retrigger generation. Production `build` does not watch.
- `frontend/src/types/workflow.ts` aliases `Workflow`, `WorkflowNode`,
  `WorkflowEdge`, `HandleDefinition`, `ValidationIssue`, and `ValidationResult`
  from `components["schemas"]`. `NodeType` and `DataType` are not named schemas;
  they are `WorkflowNode["type"]` and `HandleDefinition["type"]`. React Flow's
  `FlowNode` and `FlowEdge` stay in `flowTypes.ts`.

