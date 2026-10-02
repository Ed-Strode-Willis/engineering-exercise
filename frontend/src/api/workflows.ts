import axios, { isAxiosError } from "axios";

import type {
  WorkflowDocument,
  WorkflowSummary,
  WorkflowWrite,
} from "@/types/workflow";

/**
 * Thin API client. The base URL comes from `VITE_API_BASE_URL` (see
 * `.env.example`) and defaults to the local backend.
 */
const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const api = axios.create({ baseURL });

export async function listWorkflows(): Promise<WorkflowSummary[]> {
  const { data } = await api.get<WorkflowSummary[]>("/workflows");
  return data;
}

export async function createWorkflow(
  workflowWrite: WorkflowWrite,
): Promise<WorkflowDocument> {
  const { data } = await api.post<WorkflowDocument>("/workflows", workflowWrite);
  return data;
}

export async function getWorkflow(workflowId: string): Promise<WorkflowDocument> {
  const { data } = await api.get<WorkflowDocument>(`/workflows/${workflowId}`);
  return data;
}

export async function updateWorkflow(
  workflowId: string,
  workflowWrite: WorkflowWrite,
): Promise<WorkflowDocument> {
  const { data } = await api.put<WorkflowDocument>(
    `/workflows/${workflowId}`,
    workflowWrite,
  );
  return data;
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  await api.delete(`/workflows/${workflowId}`);
}

export function isWorkflowNotFound(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}
