import { PrismaClient, Gender, UserRole, VerificationStatus, EcoLevel, AccountStatus } from '@prisma/client';
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
    update: { accountStatus: AccountStatus.EMPLOYEE_VERIFIED, emailStatus: 'VERIFIED' },
    create: {
      email: 'admin@techieride.in',
      passwordHash: await hashPw(SEED_PASSWORD),
      fullName: 'TR Admin',
      personalEmail: 'tradmin.personal@gmail.com',
      gender: Gender.MALE,
      phone: '9000000000',
      countryCode: '+91',
      isPhoneVerified: true,
      bloodGroup: 'O+',
      companyName: 'TechieRide',
      employeeId: 'TR-ADMIN-001',
      homeLocation: 'Banjara Hills, Hyderabad',
      officeLocation: 'Madhapur, Hyderabad',
      role: UserRole.ADMIN,
      verificationStatus: VerificationStatus.APPROVED,
      emailStatus: 'VERIFIED',
      accountStatus: AccountStatus.EMPLOYEE_VERIFIED,
      isActive: true,
    },
  });
  console.log('✅ Admin:', admin.email);

  // ── Ride Seeker: Arjun ─────────────────────────────────────────────────
  const arjun = await prisma.user.upsert({
    where: { email: 'arjun@tcs.com' },
    update: { verificationStatus: VerificationStatus.APPROVED, emailStatus: 'VERIFIED', accountStatus: AccountStatus.EMPLOYEE_VERIFIED },
    create: {
      email: 'arjun@tcs.com',
      passwordHash: await hashPw(SEED_PASSWORD),
      fullName: 'Arjun Mehta',
      personalEmail: 'arjun.mehta.personal@gmail.com',
      gender: Gender.MALE,
      companyName: 'TCS',
      employeeId: 'TCS-001',
      phone: '9876543210',
      countryCode: '+91',
      isPhoneVerified: true,
      bloodGroup: 'B+',
      homeLocation: 'Kondapur, Hyderabad',
      officeLocation: 'HITEC City, Hyderabad',
      role: UserRole.RIDE_SEEKER,
      verificationStatus: VerificationStatus.APPROVED,
      emailStatus: 'VERIFIED',
      accountStatus: AccountStatus.EMPLOYEE_VERIFIED,
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
    where: { userId_verificationType: { userId: arjun.id, verificationType: 'EMPLOYEE' } },
    update: { status: VerificationStatus.APPROVED, reviewedBy: admin.id, reviewedAt: new Date() },
    create: { userId: arjun.id, verificationType: 'EMPLOYEE', employeeIdUrl: 'mock://approved', status: VerificationStatus.APPROVED, reviewedBy: admin.id, reviewedAt: new Date() },
  });
  console.log('✅ Seeker Arjun:', arjun.email);

  // ── Ride Giver: Priya ──────────────────────────────────────────────────
  const priya = await prisma.user.upsert({
    where: { email: 'priya@infosys.com' },
    update: { verificationStatus: VerificationStatus.APPROVED, emailStatus: 'VERIFIED', accountStatus: AccountStatus.DRIVER_VERIFIED },
    create: {
      email: 'priya@infosys.com',
      passwordHash: await hashPw(SEED_PASSWORD),
      fullName: 'Priya Sharma',
      personalEmail: 'priya.sharma.hyd@gmail.com',
      gender: Gender.FEMALE,
      companyName: 'Infosys',
      employeeId: 'INF-002',
      phone: '9000000001',
      countryCode: '+91',
      isPhoneVerified: true,
      bloodGroup: 'A+',
      homeLocation: 'Kondapur, Hyderabad',
      officeLocation: 'HITEC City, Hyderabad',
      role: UserRole.RIDE_GIVER,
      verificationStatus: VerificationStatus.APPROVED,
      emailStatus: 'VERIFIED',
      accountStatus: AccountStatus.DRIVER_VERIFIED,
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
    where: { userId_verificationType: { userId: priya.id, verificationType: 'EMPLOYEE' } },
    update: { status: VerificationStatus.APPROVED },
    create: { userId: priya.id, verificationType: 'EMPLOYEE', employeeIdUrl: 'mock://approved', status: VerificationStatus.APPROVED, reviewedBy: admin.id, reviewedAt: new Date() },
  });
  await prisma.verificationRequest.upsert({
    where: { userId_verificationType: { userId: priya.id, verificationType: 'DRIVER' } },
    update: { status: VerificationStatus.APPROVED },
    create: { userId: priya.id, verificationType: 'DRIVER', drivingLicenseUrl: 'mock://dl', rcUrl: 'mock://rc', status: VerificationStatus.APPROVED, reviewedBy: admin.id, reviewedAt: new Date() },
  });
  console.log('✅ Giver Priya:', priya.email, '| Vehicle:', vehicle.plateNumber);

  // ── Both: Ravi ─────────────────────────────────────────────────────────
  const ravi = await prisma.user.upsert({
    where: { email: 'ravi@wipro.com' },
    update: { accountStatus: AccountStatus.DRIVER_VERIFIED, emailStatus: 'VERIFIED' },
    create: {
      email: 'ravi@wipro.com',
      passwordHash: await hashPw(SEED_PASSWORD),
      fullName: 'Ravi Kumar',
      personalEmail: 'ravi.kumar.wipro@gmail.com',
      gender: Gender.MALE,
      companyName: 'Wipro',
      employeeId: 'WIP-101',
      phone: '9111111111',
      countryCode: '+91',
      isPhoneVerified: true,
      bloodGroup: 'O-',
      homeLocation: 'Gachibowli, Hyderabad',
      officeLocation: 'Wipro Campus, Manikonda, Hyderabad',
      role: UserRole.RIDE_GIVER,
      verificationStatus: VerificationStatus.APPROVED,
      emailStatus: 'VERIFIED',
      accountStatus: AccountStatus.DRIVER_VERIFIED,
      ecoPoints: 340,
      ecoLevel: EcoLevel.LEAF,
    },
  });
  await prisma.rideSeeker.upsert({ where: { userId: ravi.id }, update: {}, create: { userId: ravi.id, totalRidesTaken: 12, averageRating: 4.8 } });
  await prisma.rideGiver.upsert({ where: { userId: ravi.id }, update: {}, create: { userId: ravi.id, licenseVerified: true, totalRidesGiven: 8, averageRating: 4.9 } });
  console.log('✅ Both Ravi:', ravi.email, '| 🍃 LEAF level');

  // ── Dev/Test accounts (non-IT domains, dev only) ──────────────────────
  const testAccounts = [
    {
      email: 'csr@csr.com', fullName: 'CSR Admin', role: UserRole.ADMIN,
      personalEmail: 'csr.admin.tr@gmail.com', gender: Gender.FEMALE, phone: '9000000005',
      bloodGroup: 'AB+', companyName: 'TechieRide', employeeId: 'TR-CSR-001',
      homeLocation: 'Jubilee Hills, Hyderabad', officeLocation: 'Madhapur, Hyderabad',
    },
    {
      email: 'raghu@raghu.com', fullName: 'Raghu Nandan', role: UserRole.RIDE_SEEKER,
      personalEmail: 'raghu.nandan.hyd@gmail.com', gender: Gender.MALE, phone: '9000000003',
      bloodGroup: 'B-', companyName: 'HCL Technologies', employeeId: 'HCL-303',
      homeLocation: 'Miyapur, Hyderabad', officeLocation: 'HITEC City, Hyderabad',
    },
    {
      email: 'raju@raju.com', fullName: 'Raju Bhai', role: UserRole.RIDE_GIVER,
      personalEmail: 'raju.bhai.drives@gmail.com', gender: Gender.MALE, phone: '9000000002',
      bloodGroup: 'A-', companyName: 'Tech Mahindra', employeeId: 'TM-202',
      homeLocation: 'Kukatpally, Hyderabad', officeLocation: 'Nanakramguda, Hyderabad',
    },
    {
      email: 'venky@venky.com', fullName: 'Venkatesh Reddy', role: UserRole.RIDE_GIVER,
      personalEmail: 'venky.reddy.hyd@gmail.com', gender: Gender.MALE, phone: '9000000004',
      bloodGroup: 'O+', companyName: 'Cognizant', employeeId: 'COG-404',
      homeLocation: 'LB Nagar, Hyderabad', officeLocation: 'Raheja Mindspace, Hyderabad',
    },
  ];

  for (const acc of testAccounts) {
    const acctStatus = (acc.role === UserRole.RIDE_GIVER)
      ? AccountStatus.DRIVER_VERIFIED
      : AccountStatus.EMPLOYEE_VERIFIED;
    const u = await prisma.user.upsert({
      where: { email: acc.email },
      update: { accountStatus: acctStatus, emailStatus: 'VERIFIED' },
      create: {
        email: acc.email,
        passwordHash: await hashPw(SEED_PASSWORD),
        fullName: acc.fullName,
        personalEmail: acc.personalEmail,
        gender: acc.gender,
        phone: acc.phone,
        countryCode: '+91',
        isPhoneVerified: true,
        bloodGroup: acc.bloodGroup,
        companyName: acc.companyName,
        employeeId: acc.employeeId,
        homeLocation: acc.homeLocation,
        officeLocation: acc.officeLocation,
        role: acc.role,
        verificationStatus: VerificationStatus.APPROVED,
        emailStatus: 'VERIFIED',
        accountStatus: acctStatus,
        isActive: true,
      },
    });
    if (acc.role === UserRole.RIDE_SEEKER) {
      await prisma.rideSeeker.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id } });
    }
    if (acc.role === UserRole.RIDE_GIVER) {
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
