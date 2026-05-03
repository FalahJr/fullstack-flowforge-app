import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { DagParser } from "./dag.parser";
import { ExecutionService } from "./execution.service";
import { StepExecutor } from "./step.executor";
import { WorkflowEngineService } from "./workflow-engine.service";
import { AiModule } from "../ai/ai.module";
import { WorkflowEventsModule } from "../events/workflow-events.module";

@Module({
  imports: [DatabaseModule, AiModule, WorkflowEventsModule],
  providers: [DagParser, StepExecutor, ExecutionService, WorkflowEngineService],
  exports: [WorkflowEngineService, DagParser, ExecutionService, StepExecutor],
})
export class WorkflowEngineModule {}
