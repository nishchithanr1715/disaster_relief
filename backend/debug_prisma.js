const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('Prisma Models:', Object.keys(prisma).filter(key => !key.startsWith('_') && !key.startsWith('$')));
process.exit(0);
