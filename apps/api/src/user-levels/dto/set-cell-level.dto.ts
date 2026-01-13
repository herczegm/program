import { IsInt, IsUUID, Max, Min } from 'class-validator'

export class SetCellLevelDto {
  @IsUUID()
  userId!: string

  @IsUUID()
  competencyId!: string

  @IsInt()
  @Min(0)
  @Max(3)
  level!: number
}
