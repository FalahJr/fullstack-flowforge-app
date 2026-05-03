import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { UsersService } from "../users/users.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

type JwtPayload = {
  userId: string;
  tenantId: string;
  role: Role;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  health() {
    return { ok: true };
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException("Email already exists");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const { user } = await this.usersService.createTenantOwner({
      tenantName: dto.tenantName,
      email: dto.email,
      password: hashedPassword,
      role: Role.ADMIN,
    });

    return this.buildAuthResponse(
      user.id,
      user.tenantId,
      user.role,
      user.email,
    );
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.buildAuthResponse(
      user.id,
      user.tenantId,
      user.role,
      user.email,
    );
  }

  private buildAuthResponse(
    userId: string,
    tenantId: string,
    role: Role,
    email: string,
  ) {
    const payload: JwtPayload = {
      userId,
      tenantId,
      role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      tokenType: "Bearer",
      user: {
        id: userId,
        email,
        tenantId,
        role,
      },
    };
  }
}
