import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import * as bcrypt from "bcrypt";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";

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

  async findOneByTenant(userId: string, tenantId: string) {
    this.assertTenantId(tenantId);

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  findAllByTenant(tenantId: string) {
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

  async createUserInTenant(tenantId: string, dto: CreateUserDto) {
    this.assertTenantId(tenantId);

    const existingUser = await this.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException("Email already exists");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        role: dto.role ?? Role.VIEWER,
        tenantId,
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
  }

  async updateUserRole(
    tenantId: string,
    userId: string,
    dto: UpdateUserRoleDto,
  ) {
    const user = await this.findOneByTenant(userId, tenantId);

    return this.prisma.user.update({
      where: { id: user.id },
      data: { role: dto.role },
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

  async deleteUser(tenantId: string, userId: string) {
    const user = await this.findOneByTenant(userId, tenantId);

    if (user.role === Role.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { tenantId, role: Role.ADMIN },
      });

      if (adminCount <= 1) {
        throw new BadRequestException("Cannot delete the last admin in tenant");
      }
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { success: true, id: userId };
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

  private assertTenantId(tenantId: string) {
    if (!tenantId || tenantId.trim().length === 0) {
      throw new BadRequestException("tenantId is required");
    }
  }
}
