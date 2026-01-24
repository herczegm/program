import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCompetencyDto } from './dto/create-competency.dto'
import { UpdateCompetencyDto } from './dto/update-competency.dto'
import { CompetencyType } from '@prisma/client'
import { CreateCustomCompetencyDto } from './dto/create-custom-competency.dto'

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
  
  async suggest(q: string) {
    const query = q.trim()
    // if (query.length < 2) return []

    return this.prisma.competency.findMany({
      where: {
        isDeleted: false,
        group: { isDeleted: false },
        name: { contains: query, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        type: true,
        group: { select: { id: true, name: true } },
      },
      orderBy: [{ name: 'asc' }],
      take: 20,
    })
  }

  async createCustom(actorUserId: string, dto: CreateCustomCompetencyDto) {
    const group = await this.prisma.competencyGroup.findUnique({ where: { id: dto.groupId } })
    if (!group || group.isDeleted) throw new BadRequestException('Invalid groupId')

    const name = dto.name.trim()
    if (name.length < 2) throw new BadRequestException('Name must be at least 2 characters')

    // Citext + @@unique([name]) miatt ez case-insensitive egyezést ad
    const existing = await this.prisma.competency.findFirst({
      where: { name },
      select: { id: true, type: true, isDeleted: true },
    })

    if (existing) {
      if (existing.type === 'CORE') {
        // ✅ Acceptance: CORE név ütközés -> 409 + érthető
        throw new ConflictException('Ilyen névvel már létezik CORE kompetencia. Válassz másik nevet.')
      }
      // custom/egyéb ütközés is 409 (DB unique miatt úgyis)
      throw new ConflictException(existing.isDeleted
        ? 'Ilyen nevű kompetencia már létezett (törölve). Válassz másik nevet.'
        : 'Ilyen nevű kompetencia már létezik.')
    }

    // group végére
    const agg = await this.prisma.competency.aggregate({
      where: { groupId: dto.groupId, isDeleted: false, group: { isDeleted: false } },
      _max: { sortOrder: true },
    })
    const sortOrder = (agg._max.sortOrder ?? -1) + 1

    return this.prisma.competency.create({
      data: {
        name,
        type: 'CUSTOM',
        groupId: dto.groupId,
        sortOrder,
        status: 'ACTIVE',
        isDeleted: false,
        createdByUserId: actorUserId, // ✅ “ki vette fel”
      },
      include: { group: true, createdByUser: { select: { id: true, username: true } } },
    })
  }

}
