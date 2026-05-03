import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { WorkflowEngineModule } from './workflow-engine/workflow-engine.module';
import { WorkflowsModule } from './workflows/workflows.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    WorkflowsModule,
    WorkflowEngineModule,
  ],
})
export class AppModule {}
