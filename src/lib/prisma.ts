import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient({
  log: ['error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Add connection error handling
prisma.$connect()
  .then(() => {
    console.log('Prisma client connected successfully');
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err);
    // Don't throw here, let the application handle the error
  });

// Add disconnect handler for cleanup
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

export default prisma;
