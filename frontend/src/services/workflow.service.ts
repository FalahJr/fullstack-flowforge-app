import { api } from "./api";

export type Workflow = {
  id: string;
  name: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  versions?: WorkflowVersion[];
};

export type WorkflowVersion = {
  id: string;
  workflowId: string;
  definition: WorkflowDefinition;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowDefinition = {
  steps: Array<{
    id: string;
    type: "http" | "delay";
    next: string[];
    config?: Record<string, unknown>;
  }>;
};

export type WorkflowRun = {
  id: string;
  workflowId: string;
  tenantId: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  _count?: {
    stepRuns: number;
  };
};

export type StepRun = {
  id: string;
  stepId: string;
  status: string;
  error: string | null;
  logs: unknown;
  startedAt: string | null;
  finishedAt: string | null;
};

export type WorkflowRunDetail = WorkflowRun & {
  stepRuns: StepRun[];
};

export async function listWorkflows() {
  const response = await api.get<Workflow[]>("/workflows");
  return response.data;
}

export async function getWorkflow(id: string) {
  const response = await api.get<Workflow>(`/workflows/${id}`);
  return response.data;
}

export async function createWorkflow(name: string) {
  const response = await api.post<Workflow>("/workflows", { name });
  return response.data;
}

export async function updateWorkflow(id: string, name: string) {
  const response = await api.put<Workflow>(`/workflows/${id}`, { name });
  return response.data;
}

export async function updateWorkflowDefinition(id: string, definition: WorkflowDefinition) {
  const response = await api.patch<Workflow>(`/workflows/${id}/definition`, {
    definition,
  });
  return response.data;
}

export async function deleteWorkflow(id: string) {
  const response = await api.delete<{ success: boolean; id: string }>(`/workflows/${id}`);
  return response.data;
}

export async function triggerWorkflow(id: string) {
  const response = await api.post<WorkflowRun>(`/workflows/${id}/run`);
  return response.data;
}

export async function listWorkflowRuns(id: string) {
  const response = await api.get<WorkflowRun[]>(`/workflows/${id}/runs`);
  return response.data;
}

export async function getWorkflowRunDetail(id: string, runId: string) {
  const response = await api.get<WorkflowRunDetail>(`/workflows/${id}/runs/${runId}`);
  return response.data;
}
