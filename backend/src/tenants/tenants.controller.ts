import { Body, Controller, Get, Put, Req, UseGuards } from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/guards/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UpdateTenantDto } from "./dto/update-tenant.dto";
import { TenantsService } from "./tenants.service";

@Controller("tenants")
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  async me(@Req() request: any) {
    return this.tenantsService.getTenant(request.user.tenantId);
  }

  @Get("me/users")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  async users(@Req() request: any) {
    return this.tenantsService.getTenantUsers(request.user.tenantId);
  }

  @Put("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateMe(@Req() request: any, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.updateTenant(request.user.tenantId, dto);
  }

  @Get("health")
  health() {
    return this.tenantsService.health();
  }
}
