import { GraphQLScalarType, Kind } from 'graphql'
import { Prisma } from '@prisma/client'
import { userService } from '../../services/user.service'
import { productService } from '../../services/product.service'
import { orderService } from '../../services/order.service'
import { CreateUserInput, CreateUserSchema } from '../../types/user.types'
import { CreateProductInput, CreateProductSchema, FindProductsInput, FindProductsSchema } from '../../types/product.types'
import { CreateOrderInput, CreateOrderSchema } from '../../types/order.types'

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
      const { onlyAvailable } = FindProductsSchema.parse(args)
      return productService.findAll(onlyAvailable)
    },
    product:  (_: unknown, { id }: { id: string }) => productService.findById(id),
    orders:   () => orderService.findAll(),
    order:    (_: unknown, { id }: { id: string }) => orderService.findById(id),
  },

  Mutation: {
    createUser: (_: unknown, { input }: { input: CreateUserInput }) => {
      const parsed = CreateUserSchema.parse(input)
      return userService.create(parsed)
    },
    createProduct: (_: unknown, { input }: { input: CreateProductInput }) => {
      const parsed = CreateProductSchema.parse(input)
      return productService.create(parsed)
    },
   createOrder: (_: unknown, { input }: { input: CreateOrderInput }) => {
      const parsed = CreateOrderSchema.parse(input)
      return orderService.create(parsed)
    },
  },

  User:      { orders:  (p: { orders?: unknown[] })    => p.orders ?? [] },
  Order:     { items:   (p: { orderItems?: unknown[] }) => p.orderItems ?? [] },
  OrderItem: { product: (p: { product?: unknown })      => p.product },
}