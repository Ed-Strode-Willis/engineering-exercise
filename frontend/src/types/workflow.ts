/**
 * Persisted workflow contract.
 *
 * FastAPI and Pydantic are the source of truth. These aliases are derived from
 * the generated OpenAPI types in `src/types/generated.ts`. Do not edit that file
 * or `openapi/openapi.json` by hand — change the backend models and regenerate.
 *
 * React Flow's editor types stay in `features/workflow/flowTypes.ts`. Map
 * between editor state and this contract explicitly; do not persist React Flow
 * objects.
 */

import type { components } from "@/types/generated";

type ApiSchemas = components["schemas"];

export type Workflow = ApiSchemas["Workflow"];
export type WorkflowWrite = ApiSchemas["WorkflowWrite"];
export type WorkflowDocument = ApiSchemas["WorkflowDocument"];
export type WorkflowSummary = ApiSchemas["WorkflowSummary"];
export type WorkflowNode = ApiSchemas["WorkflowNode"];
export type WorkflowEdge = ApiSchemas["WorkflowEdge"];
export type HandleDefinition = ApiSchemas["HandleDefinition"];
export type ValidationIssue = ApiSchemas["ValidationIssue"];
export type ValidationResult = ApiSchemas["ValidationResult"];

/**
 * OpenAPI inlines these literals on the fields that use them, so they are not
 * named schemas. Derive the same unions from those fields.
 */
export type NodeType = WorkflowNode["type"];
export type DataType = HandleDefinition["type"];
export type WorkflowStatus = Workflow["status"];
