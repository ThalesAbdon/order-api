import { GraphQLScalarType, Kind } from 'graphql'
import { Prisma } from '@prisma/client'
import { ZodSchema, ZodError } from 'zod'
import { userService } from '../../services/user.service'
import { productService } from '../../services/product.service'
import { orderService } from '../../services/order.service'
import { ValidationError } from '../../utils/errors'
import { CreateUserInput, CreateUserSchema } from '../../types/user.types'
import { CreateProductInput, CreateProductSchema, FindProductsInput, FindProductsSchema } from '../../types/product.types'
import { CreateOrderInput, CreateOrderSchema } from '../../types/order.types'

function safeParse<T>(schema: ZodSchema<T>, input: unknown): T {
  try {
    return schema.parse(input)
  } catch (err) {
    if (err instanceof ZodError) {
      throw new ValidationError(JSON.stringify(err.issues))
    }
    throw err
  }
}

const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  serialize: (v) => (v instanceof Date ? v.toISOString() : v),
  parseValue: (v) => new Date(v as string),
  parseLiteral: (ast) => (ast.kind === Kind.STRING ? new Date(ast.value) : null),
})

const DecimalScalar = new GraphQLScalarType({
  name: 'Decimal',
  serialize: (v) => (v instanceof Prisma.Decimal ? parseFloat(v.toString()) : v),
  parseValue: (v) => new Prisma.Decimal(v as string),
  parseLiteral: (ast) =>
    ast.kind === Kind.FLOAT || ast.kind === Kind.INT ? new Prisma.Decimal(ast.value) : null,
})

export const resolvers = {
  DateTime: DateTimeScalar,
  Decimal: DecimalScalar,

  Query: {
    users:    () => userService.findAll(),
    user:     (_: unknown, { id }: { id: string }) => userService.findById(id),
    products: (_: unknown, args: FindProductsInput) => {
      const { onlyAvailable } = safeParse(FindProductsSchema, args)
      return productService.findAll(onlyAvailable)
    },
    product:  (_: unknown, { id }: { id: string }) => productService.findById(id),
    orders:   () => orderService.findAll(),
    order:    (_: unknown, { id }: { id: string }) => orderService.findById(id),
  },

  Mutation: {
    createUser: (_: unknown, { input }: { input: CreateUserInput }) => {
      const parsed = safeParse(CreateUserSchema, input)
      return userService.create(parsed)
    },
    createProduct: (_: unknown, { input }: { input: CreateProductInput }) => {
      const parsed = safeParse(CreateProductSchema, input)
      return productService.create(parsed)
    },
    createOrder: (_: unknown, { input }: { input: CreateOrderInput }) => {
      const parsed = safeParse(CreateOrderSchema, input)
      return orderService.create(parsed)
    },
  },

  User:      { orders:  (p: { orders?: unknown[] })    => p.orders ?? [] },
  Order:     { items:   (p: { orderItems?: unknown[] }) => p.orderItems ?? [] },
  OrderItem: { product: (p: { product?: unknown })      => p.product },
}