import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool

  constructor(config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL')
    if (!connectionString) {
      throw new Error('DATABASE_URL is missing (apps/api/.env)')
    }

    const pool = new Pool({ connectionString })
    super({
      adapter: new PrismaPg(pool),
    })

    this.pool = pool
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
    await this.pool.end()
  }
}
