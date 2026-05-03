import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/guards/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  async findAll(@Req() request: any) {
    return this.usersService.findAllByTenant(request.user.tenantId);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.EDITOR)
  async findOne(@Req() request: any, @Param("id") id: string) {
    return this.usersService.findOneByTenant(id, request.user.tenantId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Req() request: any, @Body() dto: CreateUserDto) {
    return this.usersService.createUserInTenant(request.user.tenantId, dto);
  }

  @Put(":id/role")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateRole(
    @Req() request: any,
    @Param("id") id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateUserRole(request.user.tenantId, id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Req() request: any, @Param("id") id: string) {
    return this.usersService.deleteUser(request.user.tenantId, id);
  }

  @Get("health")
  health() {
    return this.usersService.health();
  }
}
