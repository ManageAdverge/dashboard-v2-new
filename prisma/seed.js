const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  const adminEmail = 'manage@adverge.com';
  const adminPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN', password: adminPassword },
    create: {
      email: adminEmail,
      role: 'ADMIN',
      password: adminPassword,
      name: 'Admin User'
    },
  });
  console.log('Admin user seeded:', admin);

  const globalSettings = await prisma.globalSettings.upsert({
    where: { id: 'global' },
                            update: {},
                            create: {
      id: 'global',
      googleAdsAccountIds: [],
      selectedGoogleAdsAccountId: null,
      targetFocus: 'conversion',
      currency: 'USD',
      clientName: null,
      conversionTarget: null,
      cpaTarget: null,
      conversionValueTarget: null,
      roasTarget: null
    },
  });
  console.log('Global settings initialized:', globalSettings);
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
})
  .finally(async () => {
    await prisma.$disconnect();
  });
