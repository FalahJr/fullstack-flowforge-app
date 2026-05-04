import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { UpdateTenantDto } from "./dto/update-tenant.dto";

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  health() {
    return { ok: true };
  }

  async getTenant(tenantId: string) {
    this.assertTenantId(tenantId);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            users: true,
            workflows: true,
            workflowRuns: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException("Tenant tidak ditemukan");
    }

    return tenant;
  }

  async updateTenant(tenantId: string, dto: UpdateTenantDto) {
    this.assertTenantId(tenantId);

    await this.getTenant(tenantId);

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { name: dto.name },
    });
  }

  async getTenantUsers(tenantId: string) {
    this.assertTenantId(tenantId);

    return this.prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  private assertTenantId(tenantId: string) {
    if (!tenantId || tenantId.trim().length === 0) {
      throw new BadRequestException("tenantId diperlukan");
    }
  }
}
