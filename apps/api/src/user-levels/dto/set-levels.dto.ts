import { ArrayMinSize, IsArray, IsInt, IsUUID, Max, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

class LevelItemDto {
  @IsUUID()
  competencyId!: string

  @IsInt()
  @Min(0)
  @Max(3)
  level!: number
}

export class SetLevelsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LevelItemDto)
  items!: LevelItemDto[]
}
