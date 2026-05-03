import { Injectable } from '@nestjs/common';
import { WorkflowDefinition, WorkflowStepDefinition } from './dag.parser';
import {
  ExecutionService,
  WorkflowExecutionContext,
  WorkflowExecutionResult,
} from './execution.service';

@Injectable()
export class WorkflowEngineService {
  constructor(private readonly executionService: ExecutionService) {}

  runWorkflow(
    definition: WorkflowDefinition,
    context: WorkflowExecutionContext = {},
  ): Promise<WorkflowExecutionResult> {
    return this.executionService.execute(definition, context);
  }

  validateStep(step: WorkflowStepDefinition) {
    return step;
  }
}
