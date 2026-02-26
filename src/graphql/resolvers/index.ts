import { GraphQLScalarType, Kind } from 'graphql'
import { Prisma } from '@prisma/client'
import { userService } from '../../services/user.service'
import { productService } from '../../services/product.service'
import { orderService } from '../../services/order.service'

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
    products: () => productService.findAll(),
    product:  (_: unknown, { id }: { id: string }) => productService.findById(id),
    orders:   () => orderService.findAll(),
    order:    (_: unknown, { id }: { id: string }) => orderService.findById(id),
  },

  Mutation: {
    createUser:    (_: unknown, { input }: any) => userService.create(input),
    createProduct: (_: unknown, { input }: any) => productService.create(input),
    createOrder:   (_: unknown, { input }: any) => orderService.create(input),
  },

  User:      { orders: (p: any) => p.orders ?? [] },
  Order:     { items:  (p: any) => p.orderItems ?? [] },
  OrderItem: { product: (p: any) => p.product },
}