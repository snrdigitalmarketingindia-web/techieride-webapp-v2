import { PrismaClient, Gender, UserRole, VerificationStatus, EcoLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Techie Ride database...\n');

  // ── Admin ──────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { phone: '9999999999' },
    update: {},
    create: {
      phone: '9999999999',
      email: 'admin@techieride.in',
      fullName: 'TR Admin',
      role: UserRole.ADMIN,
      verificationStatus: VerificationStatus.APPROVED,
      isActive: true,
    },
  });
  console.log('✅ Admin:', admin.email);

  // ── Ride Seeker: Arjun ─────────────────────────────────────────────
  const arjun = await prisma.user.upsert({
    where: { phone: '9876543210' },
    update: { verificationStatus: VerificationStatus.APPROVED },
    create: {
      phone: '9876543210',
      email: 'arjun@tcs.com',
      fullName: 'Arjun Mehta',
      gender: Gender.MALE,
      companyName: 'TCS',
      employeeId: 'TCS-001',
      role: UserRole.RIDE_SEEKER,
      verificationStatus: VerificationStatus.APPROVED,
      ecoPoints: 60,
      ecoLevel: EcoLevel.SEED,
    },
  });
  await prisma.rideSeeker.upsert({
    where: { userId: arjun.id },
    update: {},
    create: { userId: arjun.id },
  });
  await prisma.verificationRequest.upsert({
    where: { userId: arjun.id },
    update: { status: VerificationStatus.APPROVED, reviewedBy: admin.id, reviewedAt: new Date() },
    create: { userId: arjun.id, employeeIdUrl: 'mock://approved', status: VerificationStatus.APPROVED, reviewedBy: admin.id, reviewedAt: new Date() },
  });
  console.log('✅ Seeker Arjun:', arjun.email);

  // ── Ride Giver: Priya ──────────────────────────────────────────────
  const priya = await prisma.user.upsert({
    where: { phone: '9000000001' },
    update: { verificationStatus: VerificationStatus.APPROVED },
    create: {
      phone: '9000000001',
      email: 'priya@infosys.com',
      fullName: 'Priya Sharma',
      gender: Gender.FEMALE,
      companyName: 'Infosys',
      employeeId: 'INF-002',
      role: UserRole.RIDE_GIVER,
      verificationStatus: VerificationStatus.APPROVED,
      ecoPoints: 180,
      ecoLevel: EcoLevel.SPROUT,
    },
  });
  const priyaGiver = await prisma.rideGiver.upsert({
    where: { userId: priya.id },
    update: { licenseVerified: true },
    create: { userId: priya.id, licenseVerified: true, totalRidesGiven: 5, averageRating: 4.7 },
  });
  const vehicle = await prisma.vehicle.upsert({
    where: { plateNumber: 'TS09AB5678' },
    update: { rcVerified: true },
    create: { rideGiverId: priyaGiver.id, make: 'Maruti', model: 'Swift', color: 'White', plateNumber: 'TS09AB5678', totalSeats: 4, rcVerified: true },
  });
  await prisma.verificationRequest.upsert({
    where: { userId: priya.id },
    update: { status: VerificationStatus.APPROVED },
    create: { userId: priya.id, employeeIdUrl: 'mock://approved', drivingLicenseUrl: 'mock://dl', rcUrl: 'mock://rc', status: VerificationStatus.APPROVED, reviewedBy: admin.id, reviewedAt: new Date() },
  });
  console.log('✅ Giver Priya:', priya.email, '| Vehicle:', vehicle.plateNumber);

  // ── Both: Ravi ─────────────────────────────────────────────────────
  const ravi = await prisma.user.upsert({
    where: { phone: '9111111111' },
    update: {},
    create: {
      phone: '9111111111',
      email: 'ravi@wipro.com',
      fullName: 'Ravi Kumar',
      gender: Gender.MALE,
      companyName: 'Wipro',
      employeeId: 'WIP-101',
      role: UserRole.BOTH,
      verificationStatus: VerificationStatus.APPROVED,
      ecoPoints: 340,
      ecoLevel: EcoLevel.LEAF,
    },
  });
  await prisma.rideSeeker.upsert({ where: { userId: ravi.id }, update: {}, create: { userId: ravi.id, totalRidesTaken: 12, averageRating: 4.8 } });
  await prisma.rideGiver.upsert({ where: { userId: ravi.id }, update: {}, create: { userId: ravi.id, licenseVerified: true, totalRidesGiven: 8, averageRating: 4.9 } });
  console.log('✅ Both Ravi:', ravi.email, '| 🍃 LEAF level');

  // ── Gamification points ────────────────────────────────────────────
  for (const [user, pts] of [[arjun, 60], [priya, 180], [ravi, 340]] as const) {
    const exists = await prisma.gamificationPoint.findFirst({ where: { userId: user.id, eventType: 'SEED_DATA' } });
    if (!exists) {
      await prisma.gamificationPoint.create({ data: { userId: user.id, eventType: 'SEED_DATA', points: pts, co2SavedG: pts * 80 } });
    }
  }
  console.log('✅ ECO points seeded');

  console.log('\n🚀 Seed complete!\n');
  console.log('Test accounts:');
  console.log('  Admin  : phone 9999999999');
  console.log('  Seeker : phone 9876543210 (Arjun / TCS)');
  console.log('  Giver  : phone 9000000001 (Priya / Infosys)');
  console.log('  Both   : phone 9111111111 (Ravi / Wipro)');
  console.log('  OTP prints to API console in dev mode.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
