#!/bin/bash
# prepare-database-migration.sh
# RDS PostgreSQL 데이터베이스 마이그레이션 준비 스크립트

echo "📊 Database Migration Preparation for AWS RDS PostgreSQL"
echo "========================================================="

# 1. 마이그레이션 파일 생성
echo ""
echo "1️⃣ Generating Prisma migration files..."
npx prisma migrate dev --name initial_production --create-only

# 2. 마이그레이션 SQL 확인
echo ""
echo "2️⃣ Migration SQL preview:"
npx prisma migrate status

# 3. 시드 데이터 준비
echo ""
echo "3️⃣ Preparing seed data..."

# 시드 파일이 없으면 생성
if [ ! -f "prisma/seed.ts" ]; then
  echo "Creating seed file..."
  cat > prisma/seed.ts << 'EOF'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 관리자 계정 생성
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@marketingplat.com' },
    update: {},
    create: {
      email: 'admin@marketingplat.com',
      password: adminPassword,
      name: '관리자',
      role: 'admin',
      plan: 'enterprise',
      coin: 999999,
    }
  })

  console.log('✅ Admin user created:', admin.email)

  // 테스트 학원 계정 생성
  const academyPassword = await bcrypt.hash('academy123', 10)
  const academy = await prisma.user.upsert({
    where: { email: 'academy@marketingplat.com' },
    update: {},
    create: {
      email: 'academy@marketingplat.com',
      password: academyPassword,
      name: '테스트학원',
      role: 'user',
      plan: 'premium',
      academyName: '테스트학원',
      academyAddress: '서울특별시 강남구',
      coin: 1000,
    }
  })

  console.log('✅ Academy user created:', academy.email)

  // Nokyang 계정 생성
  const nokyangPassword = await bcrypt.hash('nokyang123', 10)
  const nokyang = await prisma.user.upsert({
    where: { email: 'nokyang@marketingplat.com' },
    update: {},
    create: {
      email: 'nokyang@marketingplat.com',
      password: nokyangPassword,
      name: '녹양역점',
      role: 'user',
      plan: 'premium',
      academyName: '녹양역점',
      academyAddress: '경기도 의정부시',
      coin: 1000,
    }
  })

  console.log('✅ Nokyang user created:', nokyang.email)
}

main()
  .then(async () => {
    await prisma.$disconnect()
    console.log('✅ Seed completed successfully')
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
EOF
fi

# package.json에 seed 스크립트 추가
echo ""
echo "4️⃣ Adding seed script to package.json..."
if ! grep -q '"prisma":' package.json; then
  npm pkg set prisma.seed="npx tsx prisma/seed.ts"
fi

echo ""
echo "✅ Migration preparation complete!"
echo ""
echo "📝 Next steps for EC2/RDS deployment:"
echo ""
echo "1. On EC2 instance, set DATABASE_URL environment variable:"
echo "   export DATABASE_URL=\"postgresql://marketingplat:PASSWORD@RDS_ENDPOINT:5432/marketingplat\""
echo ""
echo "2. Run migration on production database:"
echo "   npx prisma migrate deploy"
echo ""
echo "3. Seed initial data (optional):"
echo "   npx prisma db seed"
echo ""
echo "4. Verify database connection:"
echo "   npx prisma db pull"
echo ""
echo "⚠️  Important: Make sure RDS security group allows connection from EC2"