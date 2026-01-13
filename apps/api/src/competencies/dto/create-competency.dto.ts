import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator'
import { CompetencyType } from '@prisma/client'

export class CreateCompetencyDto {
  @IsString()
  @MaxLength(120)
  name!: string

  @IsEnum(CompetencyType)
  @IsOptional()
  type?: CompetencyType

  @IsUUID()
  groupId!: string

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number
}
