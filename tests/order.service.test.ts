import { PrismaClient } from '@prisma/client'
import { orderService } from '../src/services/order.service'
import { userService } from '../src/services/user.service'
import { productService } from '../src/services/product.service'

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5433/order_api_test'
process.env.LOG_LEVEL = 'silent'

const prisma = new PrismaClient()

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE order_items, orders, products, users RESTART IDENTITY CASCADE'
  )
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('createOrder', () => {
  it('cria pedido e decrementa estoque', async () => {
    const user = await userService.create({ name: 'Alice', email: 'alice@test.com' })
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

  it('rejeita pedido com estoque insuficiente', async () => {
    const user = await userService.create({ name: 'Bob', email: 'bob@test.com' })
    const product = await productService.create({ name: 'Rare', price: 100, stock: 2 })

    await expect(
      orderService.create({ userId: user.id, items: [{ productId: product.id, quantity: 5 }] })
    ).rejects.toThrow(/insufficient stock/i)

    const unchanged = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(unchanged.stock).toBe(2)
  })

  it('rejeita pedido com usuário inexistente', async () => {
    const product = await productService.create({ name: 'Gadget', price: 20, stock: 5 })
    await expect(
      orderService.create({
        userId: 'a0000000-0000-0000-0000-000000000000',
        items: [{ productId: product.id, quantity: 1 }],
      })
    ).rejects.toThrow(/not found/i)
  })

  it('pedidos simultâneos não ultrapassam o estoque', async () => {
    const user = await userService.create({ name: 'Dave', email: 'dave@test.com' })
    const product = await productService.create({ name: 'Limited', price: 10, stock: 5 })

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        orderService.create({ userId: user.id, items: [{ productId: product.id, quantity: 1 }] })
      )
    )

    const ok = results.filter((r) => r.status === 'fulfilled')
    const fail = results.filter((r) => r.status === 'rejected')
    expect(ok.length).toBe(5)
    expect(fail.length).toBe(5)

    const final = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(final.stock).toBe(0)
  })

  it('rejeita pedido sem itens', async () => {
    const user = await userService.create({ name: 'Eve', email: 'eve@test.com' })
    await expect(orderService.create({ userId: user.id, items: [] })).rejects.toThrow(
      /at least one item/i
    )
  })
})

describe('createUser', () => {
  it('rejeita email duplicado', async () => {
    await userService.create({ name: 'Frank', email: 'frank@test.com' })
    await expect(
      userService.create({ name: 'Frank 2', email: 'frank@test.com' })
    ).rejects.toThrow(/email already in use/i)
  })
})

describe('createProduct', () => {
  it('rejeita preço negativo', async () => {
    await expect(productService.create({ name: 'Bad', price: -1, stock: 10 })).rejects.toThrow(/price/i)
  })
  it('rejeita estoque negativo', async () => {
    await expect(productService.create({ name: 'Bad', price: 10, stock: -1 })).rejects.toThrow(/stock/i)
  })
})