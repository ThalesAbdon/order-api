import { GraphQLErrorExtensions } from 'graphql'

export class NotFoundError extends Error {
  extensions: GraphQLErrorExtensions

  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`)
    this.name = 'NotFoundError'
    this.extensions = { code: 'NOT_FOUND' }
  }
}

export class InsufficientStockError extends Error {
  extensions: GraphQLErrorExtensions

  constructor(productId: string, available: number, requested: number) {
    super(
      `Insufficient stock for product "${productId}". ` +
      `Available: ${available}, requested: ${requested}`
    )
    this.name = 'InsufficientStockError'
    this.extensions = { code: 'BAD_USER_INPUT' }
  }
}

export class ValidationError extends Error {
  extensions: GraphQLErrorExtensions

  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
    this.extensions = { code: 'BAD_USER_INPUT' }
  }
}