import prisma from '../db/prisma'
import { CreateProductInput, FindProductsInput } from '../types/product.types'
import { NotFoundError } from '../utils/errors'
import { logger } from '../utils/logger'

export const productService = {
  async findAll(onlyAvailable = false) {
    return prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      where: onlyAvailable ? { stock: { gt: 0 } } : undefined,
    })
  },

  async findById(id: string) {
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) throw new NotFoundError('Product', id)
    return product
  },

  async create(input: CreateProductInput) {
    const product = await prisma.product.create({ data: input })
    logger.info('Product created', { productId: product.id })
    return product
  },
}