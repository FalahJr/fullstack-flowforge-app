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
    const executionOutputs: Record<string, unknown> = {};
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
          this.runStep(workflowRun?.id, context, parsed, stepId, executionOutputs),
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

        // Support conditional steps that return chosenIndex in output
        const declaredNext = parsed.nextByStepId[batchResult.stepId] ?? [];
        const chosenIndex =
          batchResult.output && typeof (batchResult.output as any).chosenIndex === "number"
            ? (batchResult.output as any).chosenIndex
            : undefined;

        if (typeof chosenIndex === "number") {
          // mark non-chosen branches as ignored and only decrement chosen one
          for (let i = 0; i < declaredNext.length; i++) {
            const nextId = declaredNext[i];

            if (i === chosenIndex) {
              const nextRemaining = (remainingDependencies.get(nextId) ?? 0) - 1;
              remainingDependencies.set(nextId, nextRemaining);

              if (nextRemaining === 0) {
                nextLevel.push(nextId);
              }
            } else {
              // mark ignored so it won't be scheduled
              remainingDependencies.set(nextId, Number.MIN_SAFE_INTEGER);
            }
          }
        } else {
          for (const nextId of declaredNext) {
            const nextRemaining = (remainingDependencies.get(nextId) ?? 0) - 1;
            remainingDependencies.set(nextId, nextRemaining);

            if (nextRemaining === 0) {
              nextLevel.push(nextId);
            }
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
        message: `Workflow selesai: ${
          workflowStatus === WorkflowRunStatus.SUCCESS ? "Berhasil" : "Gagal"
        }`,
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
    executionOutputs: Record<string, unknown>,
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
        message: `Langkah ${stepId} dimulai`,
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

      // Resolve config interpolation from previous step outputs
      const resolvedStep: WorkflowStepDefinition = {
        ...step,
        config: this.resolveStepConfig(step.config ?? {}, executionOutputs),
      };

      const output = await this.executeWithRetry(resolvedStep);

      // Save output for downstream steps
      executionOutputs[stepId] = output;

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
          message: `Langkah ${stepId} berhasil`,
        });
      }

      return { stepId, success: true, output };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Eksekusi langkah gagal";
      const aiHint = await this.aiService.generateFailureHint(
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
          message: `Langkah ${stepId} gagal: ${message}`,
        });
      }

      return { stepId, success: false, error: message };
    }
  }

  private async executeWithRetry(step: WorkflowStepDefinition) {
    const cfg = step.config ?? {};
    const maxAttempts =
      typeof cfg.maxRetries === "number" && cfg.maxRetries >= 0
        ? Math.floor(cfg.maxRetries)
        : 3;
    const initialDelayMs =
      typeof cfg.retryDelayMs === "number" && cfg.retryDelayMs >= 0
        ? cfg.retryDelayMs
        : 1000;
    const timeoutMs =
      typeof cfg.timeoutMs === "number" && cfg.timeoutMs > 0
        ? cfg.timeoutMs
        : 30000;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        // Execute with per-step timeout
        const result = await this.executeWithTimeout(
          this.stepExecutor.execute(step),
          timeoutMs,
        );

        return (result as any).output;
      } catch (error: any) {
        lastError = error;

        // Decide if error is retryable: do not retry on 4xx (except 429)
        const status = error?.response?.status;
        const is4xx = typeof status === "number" && status >= 400 && status < 500;
        const isTooManyReq = status === 429;

        if (is4xx && !isTooManyReq) {
          // Non-retryable client error
          break;
        }

        if (attempt < maxAttempts) {
          const delay = initialDelayMs * 2 ** (attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Eksekusi langkah gagal");
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number) {
    let timeoutHandle: NodeJS.Timeout | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Step execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
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

  private resolveStepConfig(
    config: Record<string, unknown>,
    outputs: Record<string, unknown>,
  ): Record<string, unknown> {
    const resolveValue = (val: unknown): unknown => {
      if (typeof val === "string") {
        // Replace ${...} patterns
        return val.replace(/\${([^}]+)}/g, (_, expr: string) => {
          try {
            const parts = expr.split(".");
            const stepId = parts[0];
            // support both `${A}` and `${A.output.field}`
            if (!stepId) return "";
            const rest = parts.slice(1);
            const base = outputs[stepId];
            if (base === undefined) return "";
            if (rest.length === 0) return String(base);
            // if first token is 'output', skip it
            const path = rest[0] === "output" ? rest.slice(1) : rest;
            let cur: any = base as any;
            for (const p of path) {
              if (cur == null) return "";
              cur = cur[p];
            }
            return cur == null ? "" : String(cur);
          } catch (e) {
            return "";
          }
        });
      }

      if (Array.isArray(val)) {
        return val.map((v) => resolveValue(v));
      }

      if (val && typeof val === "object") {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
          obj[k] = resolveValue(v);
        }
        return obj;
      }

      return val;
    };

    const resolved: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(config)) {
      resolved[k] = resolveValue(v);
    }

    return resolved;
  }
}
