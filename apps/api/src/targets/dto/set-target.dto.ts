import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator'

export class SetTargetDto {
  @IsUUID()
  userId!: string

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
