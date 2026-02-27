import { CreateUserSchema } from '../../src/types/user.types'
import { CreateProductSchema } from '../../src/types/product.types'
import { CreateOrderSchema } from '../../src/types/order.types'

describe('CreateUserSchema', () => {
  it('accepts valid input', () => {
    const result = CreateUserSchema.safeParse({ name: 'Alice', email: 'alice@test.com' })
    expect(result.success).toBe(true)
  })

  it('rejects name shorter than 2 characters', () => {
    const result = CreateUserSchema.safeParse({ name: 'A', email: 'alice@test.com' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/2 characters/i)
  })

  it('rejects invalid email format', () => {
    const result = CreateUserSchema.safeParse({ name: 'Alice', email: 'not-an-email' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/invalid email/i)
  })

  it('rejects missing fields', () => {
    const result = CreateUserSchema.safeParse({})
    expect(result.success).toBe(false)
    expect(result.error?.issues.length).toBeGreaterThanOrEqual(2)
  })
})

describe('CreateProductSchema', () => {
  it('accepts valid input', () => {
    const result = CreateProductSchema.safeParse({ name: 'Notebook', price: 3500, stock: 10 })
    expect(result.success).toBe(true)
  })

  it('rejects name shorter than 2 characters', () => {
    const result = CreateProductSchema.safeParse({ name: 'A', price: 100, stock: 5 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/2 characters/i)
  })

  it('rejects zero price', () => {
    const result = CreateProductSchema.safeParse({ name: 'Notebook', price: 0, stock: 10 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/greater than zero/i)
  })

  it('rejects negative price', () => {
    const result = CreateProductSchema.safeParse({ name: 'Notebook', price: -1, stock: 10 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/greater than zero/i)
  })

  it('rejects negative stock', () => {
    const result = CreateProductSchema.safeParse({ name: 'Notebook', price: 100, stock: -1 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/cannot be negative/i)
  })

  it('accepts zero stock', () => {
    const result = CreateProductSchema.safeParse({ name: 'Notebook', price: 100, stock: 0 })
    expect(result.success).toBe(true)
  })
})

describe('CreateOrderSchema', () => {
  const validUUID = '123e4567-e89b-42d3-a456-426614174000'

  it('accepts valid input', () => {
    const result = CreateOrderSchema.safeParse({
      userId: validUUID,
      items: [{ productId: validUUID, quantity: 2 }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid userId format', () => {
    const result = CreateOrderSchema.safeParse({
      userId: 'not-a-uuid',
      items: [{ productId: validUUID, quantity: 1 }],
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/invalid userId/i)
  })

  it('rejects invalid productId format', () => {
    const result = CreateOrderSchema.safeParse({
      userId: validUUID,
      items: [{ productId: 'not-a-uuid', quantity: 1 }],
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/invalid productId/i)
  })

  it('rejects empty items array', () => {
    const result = CreateOrderSchema.safeParse({ userId: validUUID, items: [] })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/at least one item/i)
  })

  it('rejects quantity less than 1', () => {
    const result = CreateOrderSchema.safeParse({
      userId: validUUID,
      items: [{ productId: validUUID, quantity: 0 }],
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toMatch(/at least 1/i)
  })
})