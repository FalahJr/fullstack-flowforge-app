import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { TenantsModule } from "./tenants/tenants.module";
import { UsersModule } from "./users/users.module";
import { WorkflowEngineModule } from "./workflow-engine/workflow-engine.module";
import { WorkflowsModule } from "./workflows/workflows.module";
import { QueueModule } from "./queue/queue.module";
import { WebsocketModule } from "./websocket/websocket.module";
import { AiModule } from "./ai/ai.module";
import { WorkflowEventsModule } from "./events/workflow-events.module";

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    WorkflowsModule,
    WorkflowEngineModule,
    QueueModule,
    WebsocketModule,
    AiModule,
    WorkflowEventsModule,
  ],
})
export class AppModule {}
