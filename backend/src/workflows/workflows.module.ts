import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WorkflowsService } from "./workflows.service";
import { WorkflowsController } from "./workflows.controller";
import { WorkflowEngineModule } from "../workflow-engine/workflow-engine.module";

@Module({
  imports: [AuthModule, WorkflowEngineModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
