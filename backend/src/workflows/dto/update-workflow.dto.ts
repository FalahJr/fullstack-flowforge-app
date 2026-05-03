import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class UpdateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name!: string;
}
