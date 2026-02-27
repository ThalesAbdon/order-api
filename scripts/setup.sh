set -e

echo "🚀 Setting up order-api..."

echo "📦 Installing dependencies..."
npm install

echo "🐘 Starting databases..."
docker-compose up db -d
docker-compose -f docker-compose.test.yml up db-test -d

echo "⏳ Waiting for databases..."
sleep 5

# Migrations
echo "🔄 Running migrations..."
npm run prisma:generate
npm run prisma:migrate

DATABASE_URL="postgresql://postgres:postgres@localhost:5433/order_api_test" \
  npx prisma migrate deploy

# Seed
echo "🌱 Seeding database..."
npm run prisma:seed

# Testes
echo "🧪 Running tests..."
npm test

echo ""
echo "✅ Setup complete!"
echo "👉 Run 'npm run dev' to start the server"
echo "👉 Open http://localhost:4000/graphql"