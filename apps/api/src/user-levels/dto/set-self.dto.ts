import { ArrayMinSize, IsArray, IsInt, IsUUID, Max, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class SetSelfCellDto {
  @IsUUID()
  competencyId!: string

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3)
  level!: number
}

class SelfItemDto {
  @IsUUID()
  competencyId!: string

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3)
  level!: number
}

export class SetSelfCellsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SelfItemDto)
  items!: SelfItemDto[]
}
