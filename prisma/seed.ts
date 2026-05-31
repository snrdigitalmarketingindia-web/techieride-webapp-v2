import { PrismaClient, Gender, UserRole, VerificationStatus, EcoLevel } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// All seed accounts use this password for easy testing
const SEED_PASSWORD = 'TechieRide@2024';
const BCRYPT_ROUNDS = 12;

async function hashPw(pw: string) {
  return bcrypt.hash(pw, BCRYPT_ROUNDS);
}

async function main() {
  console.log('🌱 Seeding TechieRide database...\n');

  // ── Admin ──────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@techieride.in' },
    update: {},
    create: {
      email: 'admin@techieride.in',
      passwordHash: await hashPw(SEED_PASSWORD),
      fullName: 'TR Admin',
      role: UserRole.ADMIN,
      verificationStatus: VerificationStatus.APPROVED,
      emailStatus: 'VERIFIED',
      isActive: true,
    },
  });
  console.log('✅ Admin:', admin.email);

  // ── Ride Seeker: Arjun ─────────────────────────────────────────────────
  const arjun = await prisma.user.upsert({
    where: { email: 'arjun@tcs.com' },
    update: { verificationStatus: VerificationStatus.APPROVED, emailStatus: 'VERIFIED' },
    create: {
      email: 'arjun@tcs.com',
      passwordHash: await hashPw(SEED_PASSWORD),
      fullName: 'Arjun Mehta',
      gender: Gender.MALE,
      companyName: 'TCS',
      employeeId: 'TCS-001',
      phone: '9876543210',
      role: UserRole.RIDE_SEEKER,
      verificationStatus: VerificationStatus.APPROVED,
      emailStatus: 'VERIFIED',
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

  // ── Ride Giver: Priya ──────────────────────────────────────────────────
  const priya = await prisma.user.upsert({
    where: { email: 'priya@infosys.com' },
    update: { verificationStatus: VerificationStatus.APPROVED, emailStatus: 'VERIFIED' },
    create: {
      email: 'priya@infosys.com',
      passwordHash: await hashPw(SEED_PASSWORD),
      fullName: 'Priya Sharma',
      gender: Gender.FEMALE,
      companyName: 'Infosys',
      employeeId: 'INF-002',
      phone: '9000000001',
      role: UserRole.RIDE_GIVER,
      verificationStatus: VerificationStatus.APPROVED,
      emailStatus: 'VERIFIED',
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

  // ── Both: Ravi ─────────────────────────────────────────────────────────
  const ravi = await prisma.user.upsert({
    where: { email: 'ravi@wipro.com' },
    update: {},
    create: {
      email: 'ravi@wipro.com',
      passwordHash: await hashPw(SEED_PASSWORD),
      fullName: 'Ravi Kumar',
      gender: Gender.MALE,
      companyName: 'Wipro',
      employeeId: 'WIP-101',
      phone: '9111111111',
      role: UserRole.BOTH,
      verificationStatus: VerificationStatus.APPROVED,
      emailStatus: 'VERIFIED',
      ecoPoints: 340,
      ecoLevel: EcoLevel.LEAF,
    },
  });
  await prisma.rideSeeker.upsert({ where: { userId: ravi.id }, update: {}, create: { userId: ravi.id, totalRidesTaken: 12, averageRating: 4.8 } });
  await prisma.rideGiver.upsert({ where: { userId: ravi.id }, update: {}, create: { userId: ravi.id, licenseVerified: true, totalRidesGiven: 8, averageRating: 4.9 } });
  console.log('✅ Both Ravi:', ravi.email, '| 🍃 LEAF level');

  // ── Dev/Test accounts (non-IT domains, dev only) ──────────────────────
  const testAccounts = [
    { email: 'csr@csr.com',     fullName: 'CSR Admin',   role: UserRole.ADMIN },
    { email: 'raghu@raghu.com', fullName: 'Raghu',       role: UserRole.RIDE_SEEKER },
    { email: 'raju@raju.com',   fullName: 'Raju',        role: UserRole.RIDE_GIVER },
    { email: 'venky@venky.com', fullName: 'Venky',       role: UserRole.BOTH },
  ];

  for (const acc of testAccounts) {
    const u = await prisma.user.upsert({
      where: { email: acc.email },
      update: {},
      create: {
        email: acc.email,
        passwordHash: await hashPw(SEED_PASSWORD),
        fullName: acc.fullName,
        role: acc.role,
        verificationStatus: VerificationStatus.APPROVED,
        emailStatus: 'VERIFIED',
        isActive: true,
        companyName: 'Test',
        employeeId: `TEST-${acc.fullName.toUpperCase().slice(0, 4)}`,
      },
    });
    if (acc.role === UserRole.RIDE_SEEKER || acc.role === UserRole.BOTH) {
      await prisma.rideSeeker.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id } });
    }
    if (acc.role === UserRole.RIDE_GIVER || acc.role === UserRole.BOTH) {
      const giver = await prisma.rideGiver.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id } });
      // Give each seeded giver a verified vehicle so they can publish rides immediately
      if (acc.email === 'raju@raju.com') {
        await prisma.vehicle.upsert({
          where: { plateNumber: 'TS07RJ1234' },
          update: { rcVerified: true },
          create: { rideGiverId: giver.id, make: 'Honda', model: 'City', color: 'Blue', plateNumber: 'TS07RJ1234', totalSeats: 4, rcVerified: true },
        });
      }
      if (acc.email === 'venky@venky.com') {
        await prisma.vehicle.upsert({
          where: { plateNumber: 'TS07VK5678' },
          update: { rcVerified: true },
          create: { rideGiverId: giver.id, make: 'Hyundai', model: 'i20', color: 'Red', plateNumber: 'TS07VK5678', totalSeats: 4, rcVerified: true },
        });
      }
    }
    console.log(`✅ Test account: ${acc.email} (${acc.role})`);
  }

  // ── Gamification points ────────────────────────────────────────────────
  for (const [user, pts] of [[arjun, 60], [priya, 180], [ravi, 340]] as const) {
    const exists = await prisma.gamificationPoint.findFirst({ where: { userId: user.id, eventType: 'SEED_DATA' } });
    if (!exists) {
      await prisma.gamificationPoint.create({ data: { userId: user.id, eventType: 'SEED_DATA', points: pts, co2SavedG: pts * 80 } });
    }
  }
  console.log('✅ ECO points seeded');

  console.log('\n🚀 Seed complete!\n');
  console.log('Test accounts (all use password: TechieRide@2024)');
  console.log('  Admin  : admin@techieride.in');
  console.log('  Seeker : arjun@tcs.com');
  console.log('  Giver  : priya@infosys.com');
  console.log('  Both   : ravi@wipro.com');
  console.log('\n  Dev-only test accounts:');
  console.log('  Admin  : csr@csr.com');
  console.log('  Seeker : raghu@raghu.com');
  console.log('  Giver  : raju@raju.com');
  console.log('  Both   : venky@venky.com');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
