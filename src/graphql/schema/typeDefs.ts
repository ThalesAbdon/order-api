import { gql } from 'graphql-tag'

export const typeDefs = gql`
  scalar DateTime
  scalar Decimal

  type User {
    id: ID!
    name: String!
    email: String!
    createdAt: DateTime!
    orders: [Order!]!
  }

  input CreateUserInput {
    name: String!
    email: String!
  }

  type Product {
    id: ID!
    name: String!
    price: Decimal!
    stock: Int!
    createdAt: DateTime!
  }

  input CreateProductInput {
    name: String!
    price: Float!
    stock: Int!
  }

  type Order {
    id: ID!
    user: User!
    total: Decimal!
    createdAt: DateTime!
    items: [OrderItem!]!
  }

  type OrderItem {
    id: ID!
    product: Product!
    quantity: Int!
    price: Decimal!
  }

  input OrderItemInput {
    productId: ID!
    quantity: Int!
  }

  input CreateOrderInput {
    userId: ID!
    items: [OrderItemInput!]!
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
   products(onlyAvailable: Boolean): [Product!]!
    product(id: ID!): Product
    orders: [Order!]!
    order(id: ID!): Order
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    createProduct(input: CreateProductInput!): Product!
    createOrder(input: CreateOrderInput!): Order!
  }`