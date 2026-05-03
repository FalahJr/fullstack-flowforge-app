import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class UpdateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;
}
