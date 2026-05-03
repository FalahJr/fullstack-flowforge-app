import { BadRequestException, Injectable } from '@nestjs/common';

export type WorkflowStepType = 'http' | 'delay';

export interface WorkflowStepDefinition {
  id: string;
  type: WorkflowStepType;
  next: string[];
  config?: Record<string, unknown>;
}

export interface WorkflowDefinition {
  steps: WorkflowStepDefinition[];
}

export interface ParsedWorkflow {
  stepsById: Record<string, WorkflowStepDefinition>;
  dependenciesByStepId: Record<string, string[]>;
  nextByStepId: Record<string, string[]>;
  rootStepIds: string[];
  orderedStepIds: string[];
}

@Injectable()
export class DagParser {
  parse(definition: WorkflowDefinition): ParsedWorkflow {
    if (!definition || !Array.isArray(definition.steps)) {
      throw new BadRequestException('Workflow definition must contain steps');
    }

    if (definition.steps.length === 0) {
      throw new BadRequestException('Workflow must have at least one step');
    }

    const stepsById: Record<string, WorkflowStepDefinition> = {};

    for (const step of definition.steps) {
      this.validateStepShape(step);

      if (stepsById[step.id]) {
        throw new BadRequestException(`Duplicate step id: ${step.id}`);
      }

      stepsById[step.id] = {
        ...step,
        next: [...step.next],
        config: step.config ?? {},
      };
    }

    for (const step of definition.steps) {
      for (const nextId of step.next) {
        if (!stepsById[nextId]) {
          throw new BadRequestException(
            `Step ${step.id} references unknown next step: ${nextId}`,
          );
        }
      }
    }

    const dependenciesByStepId: Record<string, string[]> = {};
    const nextByStepId: Record<string, string[]> = {};

    for (const step of definition.steps) {
      dependenciesByStepId[step.id] = [];
      nextByStepId[step.id] = [...step.next];
    }

    for (const step of definition.steps) {
      for (const nextId of step.next) {
        dependenciesByStepId[nextId].push(step.id);
      }
    }

    const visited = new Set<string>();
    const active = new Set<string>();
    const orderedStepIds: string[] = [];

    const visit = (stepId: string) => {
      if (active.has(stepId)) {
        throw new BadRequestException('Workflow DAG contains a cycle');
      }

      if (visited.has(stepId)) {
        return;
      }

      active.add(stepId);

      for (const nextId of nextByStepId[stepId]) {
        visit(nextId);
      }

      active.delete(stepId);
      visited.add(stepId);
      orderedStepIds.push(stepId);
    };

    for (const step of definition.steps) {
      visit(step.id);
    }

    orderedStepIds.reverse();

    const rootStepIds = definition.steps
      .filter((step) => dependenciesByStepId[step.id].length === 0)
      .map((step) => step.id);

    if (rootStepIds.length === 0) {
      throw new BadRequestException('Workflow must have at least one root step');
    }

    return {
      stepsById,
      dependenciesByStepId,
      nextByStepId,
      rootStepIds,
      orderedStepIds,
    };
  }

  private validateStepShape(step: WorkflowStepDefinition) {
    if (!step || typeof step.id !== 'string' || step.id.trim().length === 0) {
      throw new BadRequestException('Each step must have a valid id');
    }

    if (step.type !== 'http' && step.type !== 'delay') {
      throw new BadRequestException(`Unsupported step type: ${step.type}`);
    }

    if (!Array.isArray(step.next)) {
      throw new BadRequestException(`Step ${step.id} must define next as an array`);
    }
  }
}
