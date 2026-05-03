import { Injectable } from "@nestjs/common";
import { Role } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  health() {
    return { ok: true };
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findAllByTenant(tenantId: string) {
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

  async createTenantOwner(input: {
    tenantName: string;
    email: string;
    password: string;
    role?: Role;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: input.tenantName },
      });

      const user = await tx.user.create({
        data: {
          email: input.email,
          password: input.password,
          role: input.role ?? Role.ADMIN,
          tenantId: tenant.id,
        },
        select: {
          id: true,
          email: true,
          role: true,
          tenantId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return { tenant, user };
    });
  }
}
