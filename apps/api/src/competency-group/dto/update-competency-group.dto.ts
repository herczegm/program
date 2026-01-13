import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class UpdateCompetencyGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  // admin “restore”-hoz később hasznos, de most nem muszáj expose-olni
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean
}
