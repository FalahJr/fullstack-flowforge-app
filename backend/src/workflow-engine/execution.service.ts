import { Injectable } from "@nestjs/common";
import { Prisma, StepRunStatus, WorkflowRunStatus } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { AiService } from "../ai/ai.service";
import { WorkflowEventsService } from "../events/workflow-events.service";
import {
  DagParser,
  ParsedWorkflow,
  WorkflowDefinition,
  WorkflowStepDefinition,
} from "./dag.parser";
import { StepExecutor } from "./step.executor";

export interface WorkflowExecutionContext {
  workflowId?: string;
  tenantId?: string;
  workflowRunId?: string;
}

export interface WorkflowExecutionResult {
  status: WorkflowRunStatus | "COMPLETED";
  workflowRunId?: string;
  stepResults: Array<{
    stepId: string;
    success: boolean;
    output?: unknown;
    error?: string;
  }>;
}

@Injectable()
export class ExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dagParser: DagParser,
    private readonly stepExecutor: StepExecutor,
    private readonly aiService: AiService,
    private readonly events: WorkflowEventsService,
  ) {}

  async execute(
    definition: WorkflowDefinition,
    context: WorkflowExecutionContext = {},
  ): Promise<WorkflowExecutionResult> {
    const parsed = this.dagParser.parse(definition);
    const stepResults: WorkflowExecutionResult["stepResults"] = [];
    const workflowRun = await this.createWorkflowRun(context);
    const remainingDependencies = new Map<string, number>();

    for (const stepId of parsed.orderedStepIds) {
      remainingDependencies.set(
        stepId,
        parsed.dependenciesByStepId[stepId].length,
      );
    }

    let currentLevel = [...parsed.rootStepIds];
    let workflowStatus: WorkflowRunStatus = WorkflowRunStatus.SUCCESS;

    while (currentLevel.length > 0) {
      const nextLevel: string[] = [];
      const batchResults = await Promise.all(
        currentLevel.map((stepId) =>
          this.runStep(workflowRun?.id, context, parsed, stepId),
        ),
      );

      for (const batchResult of batchResults) {
        stepResults.push({
          stepId: batchResult.stepId,
          success: batchResult.success,
          output: batchResult.output,
          error: batchResult.error,
        });

        if (!batchResult.success) {
          workflowStatus = WorkflowRunStatus.FAILED;
          currentLevel = [];
          break;
        }

        for (const nextId of parsed.nextByStepId[batchResult.stepId]) {
          const nextRemaining = (remainingDependencies.get(nextId) ?? 0) - 1;
          remainingDependencies.set(nextId, nextRemaining);

          if (nextRemaining === 0) {
            nextLevel.push(nextId);
          }
        }
      }

      if (workflowStatus === WorkflowRunStatus.FAILED) {
        break;
      }

      currentLevel = nextLevel;
    }

    if (workflowRun) {
      await this.prisma.workflowRun.update({
        where: { id: workflowRun.id },
        data: {
          status: workflowStatus,
          finishedAt: new Date(),
        },
      });

      this.events.emit("workflow.completed", {
        workflowRunId: workflowRun.id,
        tenantId: workflowRun.tenantId,
        status: workflowStatus,
      });
    }

    return {
      status: workflowStatus,
      workflowRunId: workflowRun?.id,
      stepResults,
    };
  }

  private async runStep(
    workflowRunId: string | undefined,
    context: WorkflowExecutionContext,
    parsed: ParsedWorkflow,
    stepId: string,
  ): Promise<{
    stepId: string;
    success: boolean;
    output?: unknown;
    error?: string;
  }> {
    const step = parsed.stepsById[stepId];
    const stepRun = await this.createStepRun(workflowRunId, context, stepId);

    if (stepRun) {
      this.events.emit("step.started", {
        workflowRunId: stepRun.workflowRunId,
        tenantId: stepRun.tenantId,
        stepId,
        status: "RUNNING",
      });
    }

    try {
      if (stepRun) {
        await this.prisma.stepRun.update({
          where: { id: stepRun.id },
          data: {
            status: StepRunStatus.RUNNING,
            startedAt: new Date(),
          },
        });
      }

      const output = await this.executeWithRetry(step);

      if (stepRun) {
        await this.prisma.stepRun.update({
          where: { id: stepRun.id },
          data: {
            status: StepRunStatus.SUCCESS,
            logs: output as Prisma.InputJsonValue,
            finishedAt: new Date(),
          },
        });

        this.events.emit("step.success", {
          workflowRunId: stepRun.workflowRunId,
          tenantId: stepRun.tenantId,
          stepId,
          status: "SUCCESS",
          output,
        });
      }

      return { stepId, success: true, output };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Step execution failed";
      const aiHint = this.aiService.generateFailureHint(
        step,
        error as Error | string,
      );

      if (stepRun) {
        await this.prisma.stepRun.update({
          where: { id: stepRun.id },
          data: {
            status: StepRunStatus.FAILED,
            error: message,
            logs: {
              error: message,
              aiHint,
            } as Prisma.InputJsonValue,
            finishedAt: new Date(),
          },
        });

        this.events.emit("step.failed", {
          workflowRunId: stepRun.workflowRunId,
          tenantId: stepRun.tenantId,
          stepId,
          status: "FAILED",
          error: message,
          aiHint,
        });
      }

      return { stepId, success: false, error: message };
    }
  }

  private async executeWithRetry(step: WorkflowStepDefinition) {
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const result = await this.stepExecutor.execute(step);
        return result.output;
      } catch (error) {
        lastError = error;

        if (attempt < maxAttempts) {
          await this.sleep(2 ** attempt * 1000);
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Step execution failed");
  }

  private async createWorkflowRun(context: WorkflowExecutionContext) {
    if (context.workflowRunId) {
      return this.prisma.workflowRun.findUnique({
        where: { id: context.workflowRunId },
      });
    }

    if (!context.workflowId || !context.tenantId) {
      return null;
    }

    return this.prisma.workflowRun.create({
      data: {
        workflowId: context.workflowId,
        tenantId: context.tenantId,
        status: WorkflowRunStatus.RUNNING,
        startedAt: new Date(),
      },
    });
  }

  private async createStepRun(
    workflowRunId: string | undefined,
    context: WorkflowExecutionContext,
    stepId: string,
  ) {
    if (!workflowRunId || !context.tenantId) {
      return null;
    }

    return this.prisma.stepRun.create({
      data: {
        workflowRunId,
        tenantId: context.tenantId,
        stepId,
        status: StepRunStatus.PENDING,
      },
    });
  }

  private async sleep(durationMs: number) {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
  }
}
