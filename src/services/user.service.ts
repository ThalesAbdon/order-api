import prisma from '../db/prisma'
import { NotFoundError, ValidationError } from '../utils/errors'
import { logger } from '../utils/logger'

interface CreateUserInput {
  name: string
  email: string
}

export const userService = {
  async findAll() {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { orders: { include: { orderItems: { include: { product: true } } } } },
    })
  },

  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { orders: { include: { orderItems: { include: { product: true } } } } },
    })
    if (!user) throw new NotFoundError('User', id)
    return user
  },

  async create(input: CreateUserInput) {
    if (!input.name?.trim()) throw new ValidationError('Name is required')
    if (!input.email?.trim()) throw new ValidationError('Email is required')

    const existing = await prisma.user.findUnique({ where: { email: input.email } })
    if (existing) throw new ValidationError(`Email already in use: ${input.email}`)

    const user = await prisma.user.create({ data: input })
    logger.info('User created', { userId: user.id })
    return user
  },
}