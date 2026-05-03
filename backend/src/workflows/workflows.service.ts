import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { WorkflowEngineService } from "../workflow-engine/workflow-engine.service";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import { UpdateWorkflowDto } from "./dto/update-workflow.dto";

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: WorkflowEngineService,
  ) {}

  health() {
    return { ok: true };
  }

  async create(tenantId: string, dto: CreateWorkflowDto) {
    this.assertTenantId(tenantId);

    return this.prisma.workflow.create({
      data: {
        name: dto.name,
        tenantId,
        versions: {
          create: {
            version: 1,
            definition: { steps: [] },
          },
        },
      },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });
  }

  async findAll(tenantId: string) {
    this.assertTenantId(tenantId);

    return this.prisma.workflow.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(workflowId: string, tenantId: string) {
    this.assertTenantId(tenantId);

    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: workflowId,
        tenantId,
      },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });

    if (!workflow) throw new NotFoundException("Workflow not found");

    return workflow;
  }

  async update(workflowId: string, tenantId: string, dto: UpdateWorkflowDto) {
    await this.findOne(workflowId, tenantId);

    return this.prisma.workflow.update({
      where: { id: workflowId },
      data: { name: dto.name },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });
  }

  async remove(workflowId: string, tenantId: string) {
    await this.findOne(workflowId, tenantId);

    await this.prisma.workflow.delete({
      where: { id: workflowId },
    });

    return {
      success: true,
      id: workflowId,
    };
  }

  async triggerRun(workflowId: string, tenantId: string) {
    this.assertTenantId(tenantId);

    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, tenantId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });

    if (!workflow) throw new NotFoundException("Workflow not found");
    const version = workflow.versions && workflow.versions[0];
    if (!version) throw new NotFoundException("Workflow has no versions");

    const run = await this.prisma.workflowRun.create({
      data: {
        workflowId: workflow.id,
        tenantId: workflow.tenantId,
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    // Fire-and-forget execution
    (async () => {
      try {
        const definition = version.definition as any;
        await this.engine.runWorkflow(definition, {
          workflowRunId: run.id,
          tenantId,
        });
        await this.prisma.workflowRun.update({
          where: { id: run.id },
          data: { status: "SUCCESS", finishedAt: new Date() },
        });
      } catch (err) {
        this.logger.error("Workflow run failed", err as any);
        await this.prisma.workflowRun.update({
          where: { id: run.id },
          data: { status: "FAILED", finishedAt: new Date() },
        });
      }
    })();

    return run;
  }

  private assertTenantId(tenantId: string) {
    if (!tenantId || tenantId.trim().length === 0) {
      throw new BadRequestException("tenantId is required");
    }
  }
}
