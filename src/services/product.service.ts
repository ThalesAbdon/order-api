import prisma from '../db/prisma'
import { NotFoundError, ValidationError } from '../utils/errors'
import { logger } from '../utils/logger'

interface CreateProductInput {
  name: string
  price: number
  stock: number
}

export const productService = {
  async findAll() {
    return prisma.product.findMany({ orderBy: { createdAt: 'desc' } })
  },

  async findById(id: string) {
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) throw new NotFoundError('Product', id)
    return product
  },

  async create(input: CreateProductInput) {
    if (!input.name?.trim()) throw new ValidationError('Name is required')
    if (input.price <= 0) throw new ValidationError('Price must be greater than zero')
    if (input.stock < 0) throw new ValidationError('Stock cannot be negative')

    const product = await prisma.product.create({ data: input })
    logger.info('Product created', { productId: product.id })
    return product
  },
}