import { IsDefined, IsObject } from "class-validator";

export class UpdateWorkflowDefinitionDto {
  @IsDefined()
  @IsObject()
  definition!: Record<string, unknown>;
}
