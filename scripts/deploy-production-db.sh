#!/bin/bash
# Production database deployment script
# Usage: ./scripts/deploy-production-db.sh

set -e  # Exit on error

echo "🚀 ConvertIQ Production Database Deployment"
echo "============================================"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    echo "Set it with: export DATABASE_URL='postgresql://...'"
    exit 1
fi

echo "🔗 Database URL: $(echo $DATABASE_URL | sed 's/:.*@/:***@/')"
echo ""

# Test connection first
echo "⏳ Testing database connection..."
bun scripts/test-neon-connection.ts
if [ $? -ne 0 ]; then
    echo "❌ Database connection test failed"
    exit 1
fi

echo ""
echo "⏳ Running database migrations..."

# Generate any new migrations
echo "📝 Generating migrations..."
bun run db:generate

# Apply migrations
echo "🔄 Applying migrations to production database..."
bun run db:migrate

if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed successfully!"
else
    echo "❌ Database migration failed"
    exit 1
fi

echo ""
echo "⏳ Seeding production plans..."
bun run src/lib/seed-plans.ts

if [ $? -eq 0 ]; then
    echo "✅ Production plans seeded successfully!"
else
    echo "❌ Production plan seeding failed"
    exit 1
fi

echo ""
echo "🎉 Production database deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set DATABASE_URL in Vercel environment variables"
echo "2. Deploy your application to Vercel"
echo "3. Test the full application flow"