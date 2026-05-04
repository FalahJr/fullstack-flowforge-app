import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Patch,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/guards/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import { UpdateWorkflowDto } from "./dto/update-workflow.dto";
import { UpdateWorkflowDefinitionDto } from "./dto/update-workflow-definition.dto";
import { WorkflowsService } from "./workflows.service";

@Controller("workflows")
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  async create(@Req() request: any, @Body() dto: CreateWorkflowDto) {
    return this.workflowsService.create(request.user.tenantId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findAll(@Req() request: any) {
    return this.workflowsService.findAll(request.user.tenantId);
  }

  @Get(":id/runs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findRuns(@Req() request: any, @Param("id") id: string) {
    return this.workflowsService.findRuns(id, request.user.tenantId);
  }

  @Get(":id/runs/:runId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findRunDetail(
    @Req() request: any,
    @Param("id") id: string,
    @Param("runId") runId: string,
  ) {
    return this.workflowsService.findRunDetail(
      id,
      runId,
      request.user.tenantId,
    );
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findOne(@Req() request: any, @Param("id") id: string) {
    return this.workflowsService.findOne(id, request.user.tenantId);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  async update(
    @Req() request: any,
    @Param("id") id: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowsService.update(id, request.user.tenantId, dto);
  }

  @Patch(":id/definition")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  async updateDefinition(
    @Req() request: any,
    @Param("id") id: string,
    @Body() dto: UpdateWorkflowDefinitionDto,
  ) {
    return this.workflowsService.updateDefinition(
      id,
      request.user.tenantId,
      dto,
    );
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Req() request: any, @Param("id") id: string) {
    return this.workflowsService.remove(id, request.user.tenantId);
  }

  @Get("health")
  health() {
    return this.workflowsService.health();
  }

  @Post(":id/run")
  @HttpCode(202)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  async runWorkflow(@Req() request: any, @Param("id") id: string) {
    return this.workflowsService.triggerRun(id, request.user.tenantId);
  }
}
