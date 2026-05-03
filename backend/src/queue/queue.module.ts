import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { WorkflowEngineModule } from "../workflow-engine/workflow-engine.module";
import { AiModule } from "../ai/ai.module";
import { WorkflowEventsModule } from "../events/workflow-events.module";
import { QueueService } from "./queue.service";

@Module({
  imports: [
    DatabaseModule,
    WorkflowEngineModule,
    AiModule,
    WorkflowEventsModule,
  ],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
