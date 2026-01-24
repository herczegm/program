import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator'

export class SetSelfTargetDto {
  @IsUUID()
  competencyId!: string

  @IsInt()
  @Min(1)
  @Max(3)
  targetLevel!: number

  @IsOptional()
  @IsDateString()
  deadline?: string
}
