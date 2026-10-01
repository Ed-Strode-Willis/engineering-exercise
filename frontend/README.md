# Frontend — Workflow Editor (React + TypeScript)

A small React + TypeScript + Vite app with a running ReactFlow canvas. It
**renders a seed workflow and compiles, lints, and tests cleanly** — the editing
operations, validation feedback, and save/load wiring are the exercise (see
[`../EXERCISE.md`](../EXERCISE.md)).

## Prerequisites

- Node **20+** (`.nvmrc` at the repo root pins a version)
- npm
- Python **3.12+** and Poetry, with `poetry install` already run in `backend/`

`npm run dev` and `npm run build` export the OpenAPI schema before they do
anything else. That export runs the backend through Poetry, so frontend
development and production builds fail until the backend environment exists.

## Install & run

```bash
cd frontend
npm install
npm run dev
```

The dev server runs at `http://localhost:3000`.

Point the app at the backend by copying `.env.example` to `.env` (the default,
`http://localhost:8000`, already matches the backend starter).

## Scripts

| Command              | What it does                                              |
| -------------------- | --------------------------------------------------------- |
| `npm run dev`        | Regenerate the API contract, then start Vite              |
| `npm run build`      | Regenerate the API contract, then type-check and build    |
| `npm run generate:api` | Export OpenAPI and regenerate `src/api/generated.ts`  |
| `npm run test`       | Run Vitest in watch mode                                  |
| `npm run test:run`   | Run Vitest once                                           |
| `npm run lint`       | ESLint                                                    |
| `npm run typecheck`  | `tsc --noEmit`                                            |
| `npm run format`     | Prettier                                                  |

`generate:api` is `api:export` (Poetry runs `backend/scripts/export_openapi.py`)
followed by `api:types` (`openapi-typescript`). `predev` and `prebuild` call it,
so a normal dev server or production build never skips generation. Vite reloads
when `src/api/generated.ts` changes.

From the repository root, `npm run dev` also watches `backend/app/**/*.py` and
regenerates on change. Production builds do not watch.

## What's provided vs. what's yours

**Provided (so you don't spend time on setup):**

- React 19 + TypeScript (strict) + Vite, with a `@/` path alias.
- Tailwind CSS v4, ReactFlow (`@xyflow/react`), Zustand, TanStack Query, axios,
  and `sonner` (toasts) installed and wired.
- A running canvas (`features/workflow/WorkflowEditor.tsx`) with a basic custom
  node, node definitions, a node factory, and a seed graph.
- The persisted contract in `src/types/workflow.ts`, aliased from generated
  OpenAPI types, and an API client seam in `src/api/workflows.ts`.
- React Flow types in `features/workflow/flowTypes.ts`, kept separate from the
  persisted contract.
- Vitest configured, with one example test.

**Yours to design and build:**

- Editing: add a node, connect handles, plus one or two more operations (§C1).
- Connection rules and the feedback when a connection is rejected (§C2).
- Save/load against the API, and the states that matter — unsaved, saving,
  saved, validation failure, network failure, loading, not-found (§C3, §C5).
- How validation results are surfaced in the UI (§C4).
- The mapping between ReactFlow's `Flow*` objects and the persisted `Workflow`.

## Layout

```
frontend/src/
├── main.tsx                    # root: QueryClient + ReactFlowProvider + Toaster
├── App.tsx                     # shell
├── types/workflow.ts           # aliases of the generated API contract
├── api/
│   ├── generated.ts            # generated — do not edit
│   └── workflows.ts            # axios client seam (create / get / update)
└── features/workflow/
    ├── WorkflowEditor.tsx      # the ReactFlow canvas (start here)
    ├── WorkflowNode.tsx        # custom node (improve me)
    ├── flowTypes.ts            # ReactFlow-specific node/edge types
    ├── nodeDefinitions.ts      # handles per node type
    ├── nodeFactory.ts          # build a node of a given type
    ├── initialWorkflow.ts      # seed graph
    └── __tests__/              # example Vitest test
```

`frontend/openapi/openapi.json` is the exported schema. It is generated. Do not
edit it, or `src/api/generated.ts`, by hand.

Pydantic models are the source of truth. `src/types/workflow.ts` only aliases
`components["schemas"]` from the generated module. `NodeType` and `DataType`
are derived from `WorkflowNode["type"]` and `HandleDefinition["type"]` because
OpenAPI inlines those literals instead of naming them. React Flow's `FlowNode`
and `FlowEdge` are not those API types.

Everything here is a starting point — restructure it as you see fit and explain
material changes in your README.
