import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
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
    const token = randomUUID();
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
        webhookToken: token,
      },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });
  }

  async triggerRunByWebhook(workflowId: string, token: string, payload?: any) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });

    if (!workflow) throw new NotFoundException("Workflow tidak ditemukan");
    if (!workflow.webhookToken || workflow.webhookToken !== token) {
      throw new BadRequestException("Webhook token tidak valid");
    }

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

  async findAll(tenantId: string, query: any) {
    this.assertTenantId(tenantId);

    const page = query?.page ? Math.max(1, Number(query.page)) : 1;
    const limit = query?.limit ? Math.min(100, Math.max(1, Number(query.limit))) : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WorkflowWhereInput = { tenantId };

    if (query?.search) {
      where.name = { contains: String(query.search), mode: "insensitive" } as any;
    }

    const sortBy = query?.sortBy || "createdAt";
    const sortOrder = query?.sortOrder === "asc" ? "asc" : "desc";

    const [data, total] = await Promise.all([
      this.prisma.workflow.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          versions: {
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      }),
      this.prisma.workflow.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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

    const where: Prisma.WorkflowRunWhereInput = {
      workflowId,
      tenantId,
    };

    if (runId !== "latest") {
      where.id = runId;
    }

    const run = await this.prisma.workflowRun.findFirst({
      where,
      orderBy: { createdAt: "desc" },
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
