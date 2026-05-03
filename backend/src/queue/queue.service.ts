import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import { PrismaService } from "../database/prisma.service";
import { WorkflowEngineService } from "../workflow-engine/workflow-engine.service";
import { WorkflowEventsService } from "../events/workflow-events.service";
import type { WorkflowDefinition } from "../workflow-engine/dag.parser";

interface WorkflowRunJobData {
  workflowRunId: string;
}

const QUEUE_NAME = "workflow-run";

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queue: Queue;
  private readonly worker: Worker<WorkflowRunJobData>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly events: WorkflowEventsService,
  ) {
    const connection = this.createConnectionOptions();

    this.queue = new Queue<WorkflowRunJobData>(QUEUE_NAME, { connection });
    this.worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        if (!job?.data) {
          throw new Error("Workflow job payload is missing");
        }
        return this.processJob(job.data);
      },
      {
        connection,
      },
    );

    this.worker.on("failed", (job, err) => {
      const jobId = job?.id ?? "unknown";
      this.logger.error(
        `Workflow job failed: ${jobId}`,
        err?.message ?? String(err),
      );
    });

    this.worker.on("completed", (job) => {
      const jobId = job?.id ?? "unknown";
      this.logger.log(`Workflow job completed: ${jobId}`);
    });
  }

  async enqueueWorkflowRun(workflowRunId: string) {
    return this.queue.add(
      "run-workflow",
      { workflowRunId },
      {
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async onModuleDestroy() {
    await Promise.all([this.worker.close(), this.queue.close()]);
  }

  private async processJob(data: WorkflowRunJobData) {
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: data.workflowRunId },
      include: {
        workflow: {
          include: {
            versions: {
              orderBy: { version: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!run) {
      throw new Error(`WorkflowRun ${data.workflowRunId} not found`);
    }

    const latestVersion = run.workflow.versions?.[0];
    if (!latestVersion) {
      await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: "FAILED", finishedAt: new Date() },
      });
      throw new Error("Workflow has no versions");
    }

    const definition =
      latestVersion.definition as unknown as WorkflowDefinition;
    this.events.emit("workflow.started", {
      workflowRunId: run.id,
      tenantId: run.tenantId,
      status: "RUNNING",
    });

    try {
      await this.workflowEngine.runWorkflow(definition, {
        workflowRunId: run.id,
        tenantId: run.tenantId,
      });
    } catch (error) {
      this.logger.error("Worker execution failed", error as any);
      await this.prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: "FAILED", finishedAt: new Date() },
      });
      this.events.emit("workflow.completed", {
        workflowRunId: run.id,
        tenantId: run.tenantId,
        status: "FAILED",
      });
      throw error;
    }
  }

  private createConnectionOptions() {
    return {
      host: process.env.REDIS_HOST ?? "localhost",
      port: Number(process.env.REDIS_PORT ?? 6379),
    };
  }
}
