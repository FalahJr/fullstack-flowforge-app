import { Module } from "@nestjs/common";
import { WorkflowEventsModule } from "../events/workflow-events.module";
import { WorkflowGateway } from "./workflow.gateway";

@Module({
  imports: [WorkflowEventsModule],
  providers: [WorkflowGateway],
  exports: [WorkflowGateway],
})
export class WebsocketModule {}
