import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { TenantsService } from "./tenants.service";
import { TenantsController } from "./tenants.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
