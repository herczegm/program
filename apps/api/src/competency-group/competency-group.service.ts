import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCompetencyGroupDto } from './dto/create-competency-group.dto'
import { UpdateCompetencyGroupDto } from './dto/update-competency-group.dto'
import { CompetencyType } from '@prisma/client'

type TreeOptions = {
  type?: 'CORE' | 'CUSTOM'
  includeDeleted?: boolean
}

@Injectable()
export class CompetencyGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive() {
    return this.prisma.competencyGroup.findMany({
      where: { isDeleted: false },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
  }

  async create(dto: CreateCompetencyGroupDto) {
    try {
      return await this.prisma.competencyGroup.create({
        data: {
          name: dto.name.trim(),
          sortOrder: dto.sortOrder ?? 0,
        },
      })
    } catch (e: any) {
      // citext unique -> “duplicate” tipikusan P2002
      if (e?.code === 'P2002') throw new BadRequestException('Group name already exists')
      throw e
    }
  }

  async update(id: string, dto: UpdateCompetencyGroupDto) {
    const exists = await this.prisma.competencyGroup.findUnique({ where: { id } })
    if (!exists) throw new NotFoundException('Group not found')

    try {
      return await this.prisma.competencyGroup.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          sortOrder: dto.sortOrder,
          isDeleted: dto.isDeleted,
        },
      })
    } catch (e: any) {
      if (e?.code === 'P2002') throw new BadRequestException('Group name already exists')
      throw e
    }
  }

  async softDelete(id: string) {
    const exists = await this.prisma.competencyGroup.findUnique({ where: { id } })
    if (!exists) throw new NotFoundException('Group not found')

    // TODO később: ha van competency a csoportban, akkor tiltás vagy automatikus leválasztás
    return this.prisma.competencyGroup.update({
      where: { id },
      data: { isDeleted: true },
    })
  }

  async reorder(ids: string[]) {
    // csak aktív csoportokat engedünk reorderelni
    const groups = await this.prisma.competencyGroup.findMany({
      where: { id: { in: ids }, isDeleted: false },
      select: { id: true },
    })
    if (groups.length !== ids.length) {
      throw new BadRequestException('Some group ids are invalid or deleted')
    }

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.competencyGroup.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    )

    return this.findAllActive()
  }

  async getTree(opts: TreeOptions = {}) {
    const includeDeleted = opts.includeDeleted ?? false
    const type = opts.type

    return this.prisma.competencyGroup.findMany({
      where: includeDeleted ? {} : { isDeleted: false },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        sortOrder: true,
        isDeleted: includeDeleted ? true : false,
        competencies: {
          where: {
            ...(includeDeleted ? {} : { isDeleted: false }),
            ...(type ? { type: type as CompetencyType } : {}),
          },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            type: true,
            sortOrder: true,
            isDeleted: includeDeleted ? true : false,
          },
        },
      },
    })
  }

}
