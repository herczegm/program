import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator'

export class CreateCustomCompetencyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string

  @IsUUID()
  groupId!: string
}
