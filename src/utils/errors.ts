export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`)
    this.name = 'NotFoundError'
  }
}

export class InsufficientStockError extends Error {
  constructor(productId: string, available: number, requested: number) {
    super(
      `Insufficient stock for product "${productId}". ` +
      `Available: ${available}, requested: ${requested}`
    )
    this.name = 'InsufficientStockError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}