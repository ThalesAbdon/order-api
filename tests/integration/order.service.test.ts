import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { orderService } from '../../src/services/order.service'
import { userService } from '../../src/services/user.service'
import { productService } from '../../src/services/product.service'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma  = new PrismaClient({ adapter })

// Função helper para limpar o banco — garante ordem correta das FKs
async function cleanDatabase() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE order_items, orders, products, users RESTART IDENTITY CASCADE
  `)
}

beforeAll(async () => { await cleanDatabase() })
beforeEach(async () => { await cleanDatabase() })
afterAll(async () => { await prisma.$disconnect() })

// ─── Order.create ─────────────────────────────────────────────────────────────
describe('orderService.create', () => {

  it('creates order and decrements stock', async () => {
    const user    = await userService.create({ name: 'Alice', email: 'alice@test.com' })
    const product = await productService.create({ name: 'Widget', price: 50, stock: 10 })

    const order = await orderService.create({
      userId: user.id,
      items: [{ productId: product.id, quantity: 3 }],
    })

    expect(order.id).toBeDefined()
    expect(Number(order.total)).toBe(150)

    const updated = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(updated.stock).toBe(7)
  })

  it('calculates total correctly for multiple items', async () => {
    const user = await userService.create({ name: 'Alice', email: 'alice@test.com' })
    const p1   = await productService.create({ name: 'A', price: 100, stock: 10 })
    const p2   = await productService.create({ name: 'B', price: 200, stock: 10 })

    const order = await orderService.create({
      userId: user.id,
      items: [
        { productId: p1.id, quantity: 2 },
        { productId: p2.id, quantity: 3 },
      ],
    })

    expect(Number(order.total)).toBe(800)
  })

  it('rejects order when stock is insufficient', async () => {
    const user    = await userService.create({ name: 'Bob', email: 'bob@test.com' })
    const product = await productService.create({ name: 'Rare', price: 100, stock: 2 })

    await expect(
      orderService.create({ userId: user.id, items: [{ productId: product.id, quantity: 5 }] })
    ).rejects.toThrow(/insufficient stock/i)
  })

  it('rejects order with non-existent user', async () => {
    const product = await productService.create({ name: 'Gadget', price: 20, stock: 5 })

    await expect(
      orderService.create({
        userId: 'fake-id',
        items: [{ productId: product.id, quantity: 1 }],
      })
    ).rejects.toThrow(/not found/i)
  })

  it('rejects order with non-existent product', async () => {
    const user = await userService.create({ name: 'Carol', email: 'carol@test.com' })

    await expect(
      orderService.create({
        userId: user.id,
        items: [{ productId: 'fake-id', quantity: 1 }],
      })
    ).rejects.toThrow(/not found/i)
  })

  it('handles concurrent orders without exceeding stock', async () => {
    const user    = await userService.create({ name: 'Dave', email: 'dave@test.com' })
    const product = await productService.create({ name: 'Limited', price: 10, stock: 5 })

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        orderService.create({ userId: user.id, items: [{ productId: product.id, quantity: 1 }] })
      )
    )

    const fulfilled = results.filter(r => r.status === 'fulfilled')
    expect(fulfilled.length).toBe(5)
  })

  // ─── Branch coverage tests ─────────────────────

  it('rejects when userId is empty', async () => {
    await expect(
      orderService.create({ userId: '' as string, items: [{ productId: 'x', quantity: 1 }] })
    ).rejects.toThrow(/userId is required/i)
  })

  it('rejects when items array is empty', async () => {
    const user = await userService.create({ name: 'Test', email: 'test@test.com' })

    await expect(
      orderService.create({ userId: user.id, items: [] })
    ).rejects.toThrow(/at least one item/i)
  })

  it('rejects item without productId', async () => {
    const user = await userService.create({ name: 'Test', email: 'test@test.com' })

    await expect(
      orderService.create({
        userId: user.id,
        items: [{ productId: '' as any, quantity: 1 }],
      })
    ).rejects.toThrow(/productId/i)
  })

  it('rejects item with invalid quantity', async () => {
    const user = await userService.create({ name: 'Test', email: 'test@test.com' })
    const product = await productService.create({ name: 'P', price: 10, stock: 5 })

    await expect(
      orderService.create({
        userId: user.id,
        items: [{ productId: product.id, quantity: 0 }],
      })
    ).rejects.toThrow(/quantity/i)
  })

  it('fails when one of multiple products does not exist', async () => {
    const user = await userService.create({ name: 'Test', email: 'test@test.com' })
    const product = await productService.create({ name: 'P', price: 10, stock: 5 })

    await expect(
      orderService.create({
        userId: user.id,
        items: [
          { productId: product.id, quantity: 1 },
          { productId: 'fake-id', quantity: 1 },
        ],
      })
    ).rejects.toThrow(/not found/i)
  })

})


// ─── User ─────────────────────────────────────────────────────────────────────
describe('userService.create', () => {
  it('creates user successfully', async () => {
    const user = await userService.create({ name: 'Frank', email: 'frank@test.com' })
    expect(user.id).toBeDefined()
    expect(user.email).toBe('frank@test.com')
  })

  it('rejects duplicate email', async () => {
    await userService.create({ name: 'Frank', email: 'frank@test.com' })

    await expect(
      userService.create({ name: 'Frank 2', email: 'frank@test.com' })
    ).rejects.toThrow(/email already in use/i)
  })
})

// ─── Product ──────────────────────────────────────────────────────────────────
describe('productService.create', () => {
  it('creates product successfully', async () => {
    const product = await productService.create({ name: 'Notebook', price: 3500, stock: 10 })
    expect(product.id).toBeDefined()
    expect(product.stock).toBe(10)
  })
})

describe('productService.findAll', () => {
  it('returns only available products when onlyAvailable is true', async () => {
    await productService.create({ name: 'In Stock', price: 10, stock: 5 })
    await productService.create({ name: 'Out of Stock', price: 10, stock: 0 })

    const all       = await productService.findAll(false)
    const available = await productService.findAll(true)

    expect(all.length).toBe(2)
    expect(available.length).toBe(1)
    expect(available[0].name).toBe('In Stock')
  })

  it('returns all products when onlyAvailable is omitted', async () => {
    await productService.create({ name: 'In Stock', price: 10, stock: 5 })
    await productService.create({ name: 'Out of Stock', price: 10, stock: 0 })

    const all = await productService.findAll()

    expect(all.length).toBe(2)
  })
})

describe('productService.findById', () => {
  it('returns product by id', async () => {
    const created = await productService.create({ name: 'Notebook', price: 3500, stock: 10 })
    const found   = await productService.findById(created.id)
    expect(found.id).toBe(created.id)
  })

  it('throws NotFoundError for non-existent product', async () => {
    await expect(
      productService.findById('123e4567-e89b-42d3-a456-426614174000')
    ).rejects.toThrow(/not found/i)
  })
})

describe('userService.findById', () => {
  it('returns user by id', async () => {
    const created = await userService.create({ name: 'Alice', email: 'alice@test.com' })
    const found   = await userService.findById(created.id)
    expect(found.id).toBe(created.id)
  })

  it('throws NotFoundError for non-existent user', async () => {
    await expect(
      userService.findById('123e4567-e89b-42d3-a456-426614174000')
    ).rejects.toThrow(/not found/i)
  })
})

// ─── userService.findAll ──────────────────────────────────────────────────────
describe('userService.findAll', () => {
  it('returns all users', async () => {
    await userService.create({ name: 'Alice', email: 'alice@test.com' })
    await userService.create({ name: 'Bob',   email: 'bob@test.com'   })

    const users = await userService.findAll()
    expect(users.length).toBe(2)
  })
})



describe('orderService.findAll and findById', () => {
  it('returns all orders', async () => {
    const user    = await userService.create({ name: 'Alice', email: 'alice@test.com' })
    const product = await productService.create({ name: 'Widget', price: 50, stock: 10 })

    await orderService.create({ userId: user.id, items: [{ productId: product.id, quantity: 1 }] })
    await orderService.create({ userId: user.id, items: [{ productId: product.id, quantity: 1 }] })

    const orders = await orderService.findAll()
    expect(orders.length).toBe(2)
  })

  it('returns order by id', async () => {
    const user    = await userService.create({ name: 'Alice', email: 'alice@test.com' })
    const product = await productService.create({ name: 'Widget', price: 50, stock: 10 })

    const created = await orderService.create({
      userId: user.id,
      items: [{ productId: product.id, quantity: 1 }],
    })

    const found = await orderService.findById(created.id)
    expect(found.id).toBe(created.id)
  })

  it('throws NotFoundError for non-existent order', async () => {
    await expect(
      orderService.findById('123e4567-e89b-42d3-a456-426614174000')
    ).rejects.toThrow(/not found/i)
  })
})

describe('orderService.create edge cases', () => {
  it('rejects when userId is empty', async () => {
    await expect(
      orderService.create({ userId: '' as string, items: [{ productId: '123e4567-e89b-42d3-a456-426614174000', quantity: 1 }] })
    ).rejects.toThrow(/userId is required/i)
  })
})