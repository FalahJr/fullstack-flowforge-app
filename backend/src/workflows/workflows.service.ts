import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { QueueService } from "../queue/queue.service";
import { DagParser, WorkflowDefinition } from "../workflow-engine/dag.parser";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import { UpdateWorkflowDto } from "./dto/update-workflow.dto";
import { UpdateWorkflowDefinitionDto } from "./dto/update-workflow-definition.dto";

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly dagParser: DagParser,
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
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
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

    if (!workflow) throw new NotFoundException("Workflow tidak ditemukan");

    return workflow;
  }

  async findRuns(workflowId: string, tenantId: string) {
    this.assertTenantId(tenantId);
    await this.findOne(workflowId, tenantId);

    return this.prisma.workflowRun.findMany({
      where: {
        workflowId,
        tenantId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            stepRuns: true,
          },
        },
      },
    });
  }

  async findRunDetail(workflowId: string, runId: string, tenantId: string) {
    this.assertTenantId(tenantId);
    await this.findOne(workflowId, tenantId);

    const run = await this.prisma.workflowRun.findFirst({
      where: {
        id: runId,
        workflowId,
        tenantId,
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
        stepRuns: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!run) {
      throw new NotFoundException("Workflow run tidak ditemukan");
    }

    return run;
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

  async updateDefinition(
    workflowId: string,
    tenantId: string,
    dto: UpdateWorkflowDefinitionDto,
  ) {
    const workflow = await this.findOne(workflowId, tenantId);
    const definition = dto.definition as unknown as WorkflowDefinition;

    this.dagParser.parse(definition);

    const latestVersion = workflow.versions?.[0]?.version ?? 0;

    await this.prisma.workflowVersion.create({
      data: {
        workflowId,
        definition: definition as unknown as Prisma.InputJsonValue,
        version: latestVersion + 1,
      },
    });

    return this.findOne(workflowId, tenantId);
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

    if (!workflow) throw new NotFoundException("Workflow tidak ditemukan");
    const version = workflow.versions && workflow.versions[0];
    if (!version) throw new NotFoundException("Workflow tidak memiliki versi");

    const run = await this.prisma.workflowRun.create({
      data: {
        workflowId: workflow.id,
        tenantId: workflow.tenantId,
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    await this.queue.enqueueWorkflowRun(run.id);

    return run;
  }

  private assertTenantId(tenantId: string) {
    if (!tenantId || tenantId.trim().length === 0) {
      throw new BadRequestException("tenantId diperlukan");
    }
  }
}
