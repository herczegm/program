import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCompetencyDto } from './dto/create-competency.dto'
import { UpdateCompetencyDto } from './dto/update-competency.dto'
import { CompetencyType } from '@prisma/client'

type ByGroupOptions = { type?: 'CORE' | 'CUSTOM'; includeDeleted?: boolean }

@Injectable()
export class CompetenciesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive() {
    return this.prisma.competency.findMany({
      where: { isDeleted: false, group: { isDeleted: false } },
      include: { group: true },
      orderBy: [{ group: { sortOrder: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
    })
  }

  async create(dto: CreateCompetencyDto) {
    const group = await this.prisma.competencyGroup.findUnique({ where: { id: dto.groupId } })
    if (!group || group.isDeleted) throw new BadRequestException('Invalid groupId')

    const name = dto.name.trim()
    if (!name) throw new BadRequestException('Name is required')

    try {
      return await this.prisma.competency.create({
        data: {
          name,
          type: (dto.type ?? 'CUSTOM') as CompetencyType,
          groupId: dto.groupId,
          sortOrder: dto.sortOrder ?? 0,
        },
        include: { group: true },
      })
    } catch (e: any) {
      if (e?.code === 'P2002') throw new BadRequestException('Competency name already exists')
      throw e
    }
  }

  async update(id: string, dto: UpdateCompetencyDto) {
    const existing = await this.prisma.competency.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Competency not found')

    if (dto.groupId) {
      const group = await this.prisma.competencyGroup.findUnique({ where: { id: dto.groupId } })
      if (!group || group.isDeleted) throw new BadRequestException('Invalid groupId')
    }

    const name = dto.name?.trim()
    if (dto.name !== undefined && !name) throw new BadRequestException('Name cannot be empty')

    try {
      return await this.prisma.competency.update({
        where: { id },
        data: {
          name,
          type: dto.type ? (dto.type as CompetencyType) : undefined,
          groupId: dto.groupId,
          sortOrder: dto.sortOrder,
        },
        include: { group: true },
      })
    } catch (e: any) {
      if (e?.code === 'P2002') throw new BadRequestException('Competency name already exists')
      throw e
    }
  }

  async softDelete(id: string) {
    const existing = await this.prisma.competency.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Competency not found')

    return this.prisma.competency.update({
      where: { id },
      data: { isDeleted: true },
    })
  }

  async byGroup(opts: ByGroupOptions = {}) {
    const includeDeleted = opts.includeDeleted ?? false
    const type = opts.type

    const comps = await this.prisma.competency.findMany({
      where: {
        ...(includeDeleted ? {} : { isDeleted: false, group: { isDeleted: false } }),
        ...(type ? { type: type as CompetencyType } : {}),
      },
      select: {
        id: true,
        name: true,
        type: true,
        sortOrder: true,
        groupId: true,
        isDeleted: includeDeleted ? true : false,
      },
      orderBy: [{ groupId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    })

    const dict: Record<string, typeof comps> = {}
    for (const c of comps) {
      ;(dict[c.groupId] ??= []).push(c)
    }

    return dict
  }
  
  async reorder(ids: string[]) {
    const comps = await this.prisma.competency.findMany({
      where: { id: { in: ids }, isDeleted: false, group: { isDeleted: false } },
      select: { id: true },
    })
    if (comps.length !== ids.length) {
      throw new BadRequestException('Some competency ids are invalid or deleted')
    }

    await this.prisma.$transaction(
      ids.map((id, index) => 
        this.prisma.competency.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    )

    return this.findAllActive()
  }
  
}
