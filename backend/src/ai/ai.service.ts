import { Injectable } from "@nestjs/common";
import { WorkflowStepDefinition } from "../workflow-engine/dag.parser";

@Injectable()
export class AiService {
  generateFailureHint(step: WorkflowStepDefinition, error: Error | string) {
    const message = error instanceof Error ? error.message : String(error);
    const base = `Step ${step.id} failed with error: ${message}`;

    if (step.type === "http") {
      return `${base}. Check the request URL, method, and external service availability, then retry.`;
    }

    if (step.type === "delay") {
      return `${base}. Confirm the configured delay duration is valid and retry the workflow.`;
    }

    return `${base}. Review the step configuration and retry.`;
  }
}
