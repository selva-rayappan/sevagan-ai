import { PrismaClient, CommissionType, PaymentMode, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Service categories
  const categories = [
    { name: 'Electrical', description: 'Electrical repairs and installations' },
    { name: 'Plumbing', description: 'Plumbing repairs and installations' },
    { name: 'AC Service', description: 'Air conditioner service and repair' },
    { name: 'Carpentry', description: 'Carpentry and woodwork' },
    { name: 'Painting', description: 'Interior and exterior painting' },
    { name: 'Appliance Repair', description: 'Home appliance repair and maintenance' },
    { name: 'RO Service', description: 'RO water purifier service and installation' },
    { name: 'CCTV Installation', description: 'CCTV camera installation, repair and monitoring' },
  ];

  for (const category of categories) {
    await prisma.serviceCategory.upsert({
      where: { name: category.name },
      update: {},
      create: { ...category, active: true },
    });
  }
  console.log(`✅ ${categories.length} service categories seeded`);

  // Default commission rule: Cash — ₹20 flat
  const existingCashRule = await prisma.commissionRule.findFirst({
    where: { paymentMode: PaymentMode.CASH, active: true },
  });
  if (!existingCashRule) {
    await prisma.commissionRule.create({
      data: {
        paymentMode: PaymentMode.CASH,
        commissionType: CommissionType.FLAT,
        commissionValue: 20,
        active: true,
      },
    });
    console.log('✅ Default CASH commission rule seeded (₹20 flat)');
  }

  // Default commission rule: UPI — 5%
  const existingUpiRule = await prisma.commissionRule.findFirst({
    where: { paymentMode: PaymentMode.UPI, active: true },
  });
  if (!existingUpiRule) {
    await prisma.commissionRule.create({
      data: {
        paymentMode: PaymentMode.UPI,
        commissionType: CommissionType.PERCENTAGE,
        commissionValue: 5,
        active: true,
      },
    });
    console.log('✅ Default UPI commission rule seeded (5%)');
  }

  // Default admin user
  const adminEmail = 'admin@sevagan.ai';
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@123!', 10);
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Sevagan Admin',
        role: AdminRole.ADMIN,
        active: true,
      },
    });
    console.log(`✅ Default admin user seeded (${adminEmail} / Admin@123!)`);
    console.log('   ⚠️  Change the admin password immediately after first login!');
  }

  console.log('\nSeed completed successfully.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
