import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

declare global {
  var __prisma: PrismaClient | undefined
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

export const prisma =
  global.__prisma ?? new PrismaClient({ adapter, log: ['query', 'error', 'warn'], })

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma
}

export default prisma