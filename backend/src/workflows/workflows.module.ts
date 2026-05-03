import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WorkflowsService } from "./workflows.service";
import { WorkflowsController } from "./workflows.controller";
import { WorkflowEngineModule } from "../workflow-engine/workflow-engine.module";
import { QueueModule } from "../queue/queue.module";

@Module({
  imports: [AuthModule, WorkflowEngineModule, QueueModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
