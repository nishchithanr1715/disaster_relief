const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // Users
  const victim = await prisma.user.upsert({
    where: { email: 'victim@example.com' },
    update: {},
    create: {
      name: 'Vicky Victim',
      email: 'victim@example.com',
      phone: '1234567890',
      passwordHash,
      role: 'VICTIM',
      victimProfile: { create: { address: '123 Flood St' } }
    }
  });

  const volunteer = await prisma.user.upsert({
    where: { email: 'volunteer@example.com' },
    update: {},
    create: {
      name: 'Val Volunteer',
      email: 'volunteer@example.com',
      phone: '0987654321',
      passwordHash,
      role: 'VOLUNTEER',
      volunteerProfile: { create: { skills: 'First Aid, Driving', verified: true } }
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Andy Admin',
      email: 'admin@example.com',
      phone: '1122334455',
      passwordHash,
      role: 'NGO_ADMIN',
      ngoProfile: { create: { organizationName: 'Global Relief' } }
    }
  });

  console.log('Users seeded.');

  // Get profiles
  const victimProfile = await prisma.victimProfile.findUnique({ where: { userId: victim.id } });
  const ngoProfile = await prisma.nGOProfile.findUnique({ where: { userId: admin.id } });

  // Help Requests
  const requests = [
    {
      requestType: 'rescue',
      description: 'Water level rising, trapped on roof!',
      peopleCount: 4,
      latitude: 12.9716,
      longitude: 77.5946,
      priority: 'CRITICAL',
      status: 'PENDING'
    },
    {
      requestType: 'medical',
      description: 'Elderly person with severe breathing difficulty',
      peopleCount: 1,
      latitude: 12.9800,
      longitude: 77.6000,
      priority: 'CRITICAL',
      status: 'PENDING'
    },
    {
      requestType: 'food',
      description: 'No food for 2 days, 3 children',
      peopleCount: 5,
      latitude: 12.9600,
      longitude: 77.5800,
      priority: 'HIGH',
      status: 'PENDING'
    }
  ];

  for (const r of requests) {
    await prisma.helpRequest.create({
      data: {
        ...r,
        victimId: victimProfile.id
      }
    });
  }

  console.log('Help requests seeded.');

  // Resources
  const resources = [
    { resourceType: 'Food Packets', quantityAvailable: 500, unit: 'packets' },
    { resourceType: 'Water Bottles', quantityAvailable: 1000, unit: 'liters' },
    { resourceType: 'Medical Kits', quantityAvailable: 50, unit: 'kits' },
    { resourceType: 'Blankets', quantityAvailable: 200, unit: 'units' }
  ];

  for (const res of resources) {
    await prisma.resource.create({
      data: {
        ...res,
        ngoId: ngoProfile.id
      }
    });
  }

  console.log('Resources seeded.');
  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
