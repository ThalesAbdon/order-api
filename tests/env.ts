process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5433/order_api_test'
process.env.LOG_LEVEL = 'silent'