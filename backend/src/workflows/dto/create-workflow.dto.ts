import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name!: string;
}
