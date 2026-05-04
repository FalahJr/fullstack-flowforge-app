import { Injectable } from "@nestjs/common";
import { EventEmitter } from "events";

export type WorkflowEventName =
  | "workflow.started"
  | "workflow.completed"
  | "step.started"
  | "step.success"
  | "step.failed";

export interface WorkflowEventPayload {
  workflowRunId: string;
  tenantId: string;
  status?: string;
  stepId?: string;
  output?: unknown;
  error?: string;
  aiHint?: string;
  message?: string;
}

@Injectable()
export class WorkflowEventsService {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  emit(event: WorkflowEventName, payload: WorkflowEventPayload) {
    this.emitter.emit(event, payload);
  }

  on(
    event: WorkflowEventName,
    listener: (payload: WorkflowEventPayload) => void,
  ) {
    this.emitter.on(event, listener);
  }
}
