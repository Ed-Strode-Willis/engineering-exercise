/* Generated from openapi/openapi.json by scripts/generateZodSchema.mjs. Do not edit. */

import { z } from "zod"

export const validationErrorSchema = z.object({ "ctx": z.record(z.string(), z.any()).optional(), "input": z.any().optional(), "loc": z.array(z.union([z.string(), z.number().int()])), "msg": z.string(), "type": z.string() })
export type ValidationErrorSchema = z.infer<typeof validationErrorSchema>

export const httpValidationErrorSchema = z.object({ "detail": z.array(validationErrorSchema).optional() })
export type HttpValidationErrorSchema = z.infer<typeof httpValidationErrorSchema>

export const handleDefinitionSchema = z.object({ "id": z.string().regex(new RegExp(".*\\S.*")).min(1), "label": z.string().regex(new RegExp(".*\\S.*")).min(1), "required": z.boolean().default(false), "type": z.enum(["Dataset","Model"]) })
export type HandleDefinitionSchema = z.infer<typeof handleDefinitionSchema>

export const positionSchema = z.object({ "x": z.number(), "y": z.number() })
export type PositionSchema = z.infer<typeof positionSchema>

export const validationIssueSchema = z.object({ "code": z.string().regex(new RegExp(".*\\S.*")).min(1), "edgeId": z.union([z.string(), z.null()]).optional(), "message": z.string().regex(new RegExp(".*\\S.*")).min(1), "nodeId": z.union([z.string(), z.null()]).optional(), "path": z.union([z.string(), z.null()]).optional(), "severity": z.enum(["error","warning"]) }).describe("A single coded, path-addressed diagnostic.\n\n`message` is written for the person using the editor, so it names node and\nhandle labels. The matching id-based message goes to the backend log.")
export type ValidationIssueSchema = z.infer<typeof validationIssueSchema>

export const validationResultSchema = z.object({ "errors": z.array(validationIssueSchema).default([]), "valid": z.boolean(), "warnings": z.array(validationIssueSchema).default([]) })
export type ValidationResultSchema = z.infer<typeof validationResultSchema>

export const workflowEdgeSchema = z.object({ "id": z.string().regex(new RegExp(".*\\S.*")).min(1), "sourceHandleId": z.string().regex(new RegExp(".*\\S.*")).min(1), "sourceNodeId": z.string().regex(new RegExp(".*\\S.*")).min(1), "targetHandleId": z.string().regex(new RegExp(".*\\S.*")).min(1), "targetNodeId": z.string().regex(new RegExp(".*\\S.*")).min(1) })
export type WorkflowEdgeSchema = z.infer<typeof workflowEdgeSchema>

export const workflowNodeDataSchema = z.object({ "inputs": z.array(handleDefinitionSchema).default([]), "label": z.string().regex(new RegExp(".*\\S.*")).min(1), "outputs": z.array(handleDefinitionSchema).default([]) })
export type WorkflowNodeDataSchema = z.infer<typeof workflowNodeDataSchema>

export const workflowNodeSchema = z.object({ "data": workflowNodeDataSchema, "id": z.string().regex(new RegExp(".*\\S.*")).min(1), "position": positionSchema, "type": z.enum(["DataSource","Transform","Model"]) })
export type WorkflowNodeSchema = z.infer<typeof workflowNodeSchema>

export const workflowSchema = z.object({ "edges": z.array(workflowEdgeSchema).default([]), "id": z.string().regex(new RegExp(".*\\S.*")).min(1), "name": z.string().regex(new RegExp(".*\\S.*")).min(1), "nodes": z.array(workflowNodeSchema).default([]), "status": z.enum(["valid","invalid"]) })
export type WorkflowSchema = z.infer<typeof workflowSchema>

export const workflowDocumentSchema = z.object({ "validation": validationResultSchema, "workflow": workflowSchema }).describe("A stored workflow together with the validation of that document.")
export type WorkflowDocumentSchema = z.infer<typeof workflowDocumentSchema>

export const workflowSummarySchema = z.object({ "id": z.string().regex(new RegExp(".*\\S.*")).min(1), "name": z.string().regex(new RegExp(".*\\S.*")).min(1), "status": z.enum(["valid","invalid"]) })
export type WorkflowSummarySchema = z.infer<typeof workflowSummarySchema>

export const workflowWriteSchema = z.object({ "edges": z.array(workflowEdgeSchema).default([]), "name": z.string().regex(new RegExp(".*\\S.*")).min(1), "nodes": z.array(workflowNodeSchema).default([]) }).describe("A workflow document submitted by a client. The server assigns id and status.")
export type WorkflowWriteSchema = z.infer<typeof workflowWriteSchema>

