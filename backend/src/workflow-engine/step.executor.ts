import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { WorkflowStepDefinition } from './dag.parser';

export interface StepExecutionResult {
  success: boolean;
  output?: unknown;
}

@Injectable()
export class StepExecutor {
  async execute(step: WorkflowStepDefinition): Promise<StepExecutionResult> {
    if (step.type === 'http') {
      const url = this.readStringConfig(step, 'url');
      const method = this.readStringConfig(step, 'method', 'GET').toLowerCase();

      const response = await axios.request({
        url,
        method: method as 'get' | 'post' | 'put' | 'patch' | 'delete',
      });

      return {
        success: true,
        output: {
          status: response.status,
          data: response.data,
        },
      };
    }

    if (step.type === 'delay') {
      const durationMs = this.readNumberConfig(step, 'durationMs', 1000);
      await this.sleep(durationMs);

      return {
        success: true,
        output: { waitedMs: durationMs },
      };
    }

    throw new Error(`Unsupported step type: ${step.type}`);
  }

  private readStringConfig(
    step: WorkflowStepDefinition,
    key: string,
    fallback?: string,
  ) {
    const value = step.config?.[key];

    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }

    if (fallback !== undefined) {
      return fallback;
    }

    throw new Error(`Missing config value ${key} for step ${step.id}`);
  }

  private readNumberConfig(
    step: WorkflowStepDefinition,
    key: string,
    fallback: number,
  ) {
    const value = step.config?.[key];

    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }

    return fallback;
  }

  private async sleep(durationMs: number) {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
  }
}
