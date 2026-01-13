import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'
import { CompetencyType } from '@prisma/client'

export class UpdateCompetencyDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsEnum(CompetencyType)
  @IsOptional()
  type?: CompetencyType

  @IsOptional()
  @IsUUID()
  groupId?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number

  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean
}
