import { PrismaClient, Gender, UserRole, VerificationStatus, EcoLevel, AccountStatus, TrustBand } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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
    update: { accountStatus: AccountStatus.EMPLOYEE_VERIFIED, emailStatus: 'VERIFIED', isActive: true },
    create: {
      email: 'admin@techieride.in',
      passwordHash: await hashPw(SEED_PASSWORD),
      fullName: 'TR Admin',
      personalEmail: 'admin.testtr@gmail.com',
      gender: Gender.MALE,
      phone: '9999999999',
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
      ecoPoints: 500,
      ecoLevel: EcoLevel.LEAF,
      trustScore: 85,
      trustBand: TrustBand.PLATINUM,
      isActive: true,
    },
  });
  await prisma.rideSeeker.upsert({ where: { userId: admin.id }, update: {}, create: { userId: admin.id } });
  await prisma.rideGiver.upsert({ where: { userId: admin.id }, update: {}, create: { userId: admin.id } });
  await prisma.emergencyContact.upsert({
    where: { id: 'ec-admin-001' },
    update: {},
    create: { id: 'ec-admin-001', userId: admin.id, name: 'Lakshmi Admin', phone: '9100000001', relationship: 'Spouse' },
  }).catch(() => prisma.emergencyContact.findFirst({ where: { userId: admin.id } }));
  console.log('✅ Admin:', admin.email);

  // ── Ride Seeker: Arjun ─────────────────────────────────────────────────
  const arjun = await prisma.user.upsert({
    where: { email: 'arjun@tcs.com' },
    update: { verificationStatus: VerificationStatus.APPROVED, emailStatus: 'VERIFIED', accountStatus: AccountStatus.EMPLOYEE_VERIFIED, isActive: true },
    create: {
      email: 'arjun@tcs.com',
      passwordHash: await hashPw(SEED_PASSWORD),
      fullName: 'Arjun Mehta',
      personalEmail: 'arjun.testtr@gmail.com',
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
      trustScore: 35,
      trustBand: TrustBand.BRONZE,
      isActive: true,
    },
  });
  await prisma.rideSeeker.upsert({ where: { userId: arjun.id }, update: {}, create: { userId: arjun.id } });
  await prisma.verificationRequest.upsert({
    where: { userId_verificationType: { userId: arjun.id, verificationType: 'EMPLOYEE' } },
    update: { status: VerificationStatus.APPROVED, reviewedBy: admin.id, reviewedAt: new Date() },
    create: { userId: arjun.id, verificationType: 'EMPLOYEE', employeeIdUrl: 'mock://approved', status: VerificationStatus.APPROVED, reviewedBy: admin.id, reviewedAt: new Date() },
  });
  await prisma.emergencyContact.upsert({
    where: { id: 'ec-arjun-001' },
    update: {},
    create: { id: 'ec-arjun-001', userId: arjun.id, name: 'Sunita Mehta', phone: '9100000002', relationship: 'Mother' },
  }).catch(() => prisma.emergencyContact.findFirst({ where: { userId: arjun.id } }));
  console.log('✅ Seeker Arjun:', arjun.email);

  // ── Ride Seeker: Tapaswini ─────────────────────────────────────────────
  const tapaswini = await prisma.user.upsert({
    where: { email: 'tapaswini@tapaswini.com' },
    update: { verificationStatus: VerificationStatus.APPROVED, emailStatus: 'VERIFIED', accountStatus: AccountStatus.EMPLOYEE_VERIFIED, isActive: true },
    create: {
      email: 'tapaswini@tapaswini.com',
      passwordHash: await hashPw(SEED_PASSWORD),
      fullName: 'Sai Tapaswini',
      personalEmail: 'saitapaswini.testtr@gmail.com',
      gender: Gender.FEMALE,
      companyName: 'Wipro',
      employeeId: 'WIP-101',
      phone: '7702166977',
      countryCode: '+91',
      isPhoneVerified: true,
      bloodGroup: 'O-',
      homeLocation: 'Gachibowli, Hyderabad',
      officeLocation: 'Wipro Campus, Manikonda, Hyderabad',
      role: UserRole.RIDE_SEEKER,
      verificationStatus: VerificationStatus.APPROVED,
      emailStatus: 'VERIFIED',
      accountStatus: AccountStatus.EMPLOYEE_VERIFIED,
      ecoPoints: 60,
      ecoLevel: EcoLevel.SEED,
      trustScore: 30,
      trustBand: TrustBand.BRONZE,
      isActive: true,
    },
  });
  await prisma.rideSeeker.upsert({ where: { userId: tapaswini.id }, update: {}, create: { userId: tapaswini.id } });
  await prisma.verificationRequest.upsert({
    where: { userId_verificationType: { userId: tapaswini.id, verificationType: 'EMPLOYEE' } },
    update: { status: VerificationStatus.APPROVED, reviewedBy: admin.id, reviewedAt: new Date() },
    create: { userId: tapaswini.id, verificationType: 'EMPLOYEE', employeeIdUrl: 'mock://approved', status: VerificationStatus.APPROVED, reviewedBy: admin.id, reviewedAt: new Date() },
  });
  await prisma.emergencyContact.upsert({
    where: { id: 'ec-tapaswini-001' },
    update: {},
    create: { id: 'ec-tapaswini-001', userId: tapaswini.id, name: 'Srinivas Sadhu', phone: '9100000003', relationship: 'Father' },
  }).catch(() => prisma.emergencyContact.findFirst({ where: { userId: tapaswini.id } }));
  console.log('✅ Seeker Tapaswini:', tapaswini.email);

  // ── Ride Giver: Rahul ──────────────────────────────────────────────────
  const rahul = await prisma.user.upsert({
    where: { email: 'rahul@rahul.com' },
    update: { verificationStatus: VerificationStatus.APPROVED, emailStatus: 'VERIFIED', accountStatus: AccountStatus.DRIVER_VERIFIED, isActive: true },
    create: {
      email: 'rahul@rahul.com',
      passwordHash: await hashPw(SEED_PASSWORD),
      fullName: 'Rahul Sharma',
      personalEmail: 'rahul.testtr@gmail.com',
      gender: Gender.MALE,
      companyName: 'Infosys',
      employeeId: 'INF-002',
      phone: '9849808599',
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
      trustScore: 55,
      trustBand: TrustBand.SILVER,
      isActive: true,
    },
  });
  const rahulGiver = await prisma.rideGiver.upsert({
    where: { userId: rahul.id },
    update: { licenseVerified: true },
    create: { userId: rahul.id, licenseVerified: true, totalRidesGiven: 5, averageRating: 4.7 },
  });
  await prisma.vehicle.upsert({
    where: { plateNumber: 'TS09AB5678' },
    update: { rideGiverId: rahulGiver.id, rcVerified: true },
    create: { rideGiverId: rahulGiver.id, make: 'Maruti', model: 'Swift', color: 'White', plateNumber: 'TS09AB5678', totalSeats: 4, rcVerified: true },
  });
  await prisma.verificationRequest.upsert({
    where: { userId_verificationType: { userId: rahul.id, verificationType: 'EMPLOYEE' } },
    update: { status: VerificationStatus.APPROVED },
    create: { userId: rahul.id, verificationType: 'EMPLOYEE', employeeIdUrl: 'mock://approved', status: VerificationStatus.APPROVED, reviewedBy: admin.id, reviewedAt: new Date() },
  });
  await prisma.verificationRequest.upsert({
    where: { userId_verificationType: { userId: rahul.id, verificationType: 'DRIVER' } },
    update: { status: VerificationStatus.APPROVED },
    create: { userId: rahul.id, verificationType: 'DRIVER', drivingLicenseUrl: 'mock://dl', rcUrl: 'mock://rc', status: VerificationStatus.APPROVED, reviewedBy: admin.id, reviewedAt: new Date() },
  });
  await prisma.emergencyContact.upsert({
    where: { id: 'ec-rahul-001' },
    update: {},
    create: { id: 'ec-rahul-001', userId: rahul.id, name: 'Meena Sharma', phone: '9100000004', relationship: 'Wife' },
  }).catch(() => prisma.emergencyContact.findFirst({ where: { userId: rahul.id } }));
  console.log('✅ Giver Rahul:', rahul.email);

  // ── Dev/Test accounts ──────────────────────────────────────────────────
  const testAccounts = [
    {
      email: 'csr@csr.com', fullName: 'CSR Admin', role: UserRole.ADMIN,
      personalEmail: 'csr.testtr@gmail.com', gender: Gender.FEMALE, phone: '9989437777',
      bloodGroup: 'AB+', companyName: 'TechieRide', employeeId: 'TR-CSR-001',
      homeLocation: 'Jubilee Hills, Hyderabad', officeLocation: 'Madhapur, Hyderabad',
      ecoPoints: 120, ecoLevel: EcoLevel.SPROUT, trustScore: 50, trustBand: TrustBand.SILVER,
      emergency: { id: 'ec-csr-001', name: 'Ramesh Kumar', phone: '9100000005', relationship: 'Husband' },
    },
    {
      email: 'raghu@raghu.com', fullName: 'Raghu Sri', role: UserRole.RIDE_SEEKER,
      personalEmail: 'raghu.testtr@gmail.com', gender: Gender.MALE, phone: '9581166626',
      bloodGroup: 'B-', companyName: 'HCL Technologies', employeeId: 'HCL-303',
      homeLocation: 'Miyapur, Hyderabad', officeLocation: 'HITEC City, Hyderabad',
      ecoPoints: 40, ecoLevel: EcoLevel.SEED, trustScore: 25, trustBand: TrustBand.BRONZE,
      emergency: { id: 'ec-raghu-001', name: 'Padma Sri', phone: '9100000006', relationship: 'Mother' },
    },
    {
      email: 'raju@raju.com', fullName: 'Rajendra Prasad', role: UserRole.RIDE_GIVER,
      personalEmail: 'raju.testtr@gmail.com', gender: Gender.MALE, phone: '9948695942',
      bloodGroup: 'A-', companyName: 'Tech Mahindra', employeeId: 'TM-202',
      homeLocation: 'Kukatpally, Hyderabad', officeLocation: 'Nanakramguda, Hyderabad',
      ecoPoints: 220, ecoLevel: EcoLevel.SPROUT, trustScore: 60, trustBand: TrustBand.SILVER,
      emergency: { id: 'ec-raju-001', name: 'Sunitha Prasad', phone: '9100000007', relationship: 'Wife' },
    },
    {
      email: 'venky@venky.com', fullName: 'Venkatesh Enjamoori', role: UserRole.RIDE_GIVER,
      personalEmail: 'venky.testtr@gmail.com', gender: Gender.MALE, phone: '9866911799',
      bloodGroup: 'O+', companyName: 'Cognizant', employeeId: 'COG-404',
      homeLocation: 'LB Nagar, Hyderabad', officeLocation: 'Raheja Mindspace, Hyderabad',
      ecoPoints: 310, ecoLevel: EcoLevel.LEAF, trustScore: 70, trustBand: TrustBand.GOLD,
      emergency: { id: 'ec-venky-001', name: 'Vijaya Enjamoori', phone: '9100000008', relationship: 'Father' },
    },
    {
      email: 'harish@harish.com', fullName: 'Harish Reddy Sadhu', role: UserRole.RIDE_GIVER,
      personalEmail: 'harish.testtr@gmail.com', gender: Gender.MALE, phone: '9849465601',
      bloodGroup: 'B+', companyName: 'Accenture', employeeId: 'ACC-505',
      homeLocation: 'Manikonda, Hyderabad', officeLocation: 'Nanakramguda, Hyderabad',
      ecoPoints: 150, ecoLevel: EcoLevel.SPROUT, trustScore: 45, trustBand: TrustBand.SILVER,
      emergency: { id: 'ec-harish-001', name: 'Anitha Sadhu', phone: '9100000009', relationship: 'Sister' },
    },
  ];

  for (const acc of testAccounts) {
    const acctStatus = (acc.role === UserRole.RIDE_GIVER)
      ? AccountStatus.DRIVER_VERIFIED
      : AccountStatus.EMPLOYEE_VERIFIED;
    const u = await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        // System fields only — never overwrite user-editable profile fields
        // (fullName, phone, gender, bloodGroup, companyName, homeLocation,
        //  officeLocation, personalEmail, profilePhoto, countryCode all preserved)
        accountStatus: acctStatus,
        emailStatus: 'VERIFIED',
        verificationStatus: VerificationStatus.APPROVED,
        role: acc.role,
        isActive: true,
      },
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
        ecoPoints: acc.ecoPoints,
        ecoLevel: acc.ecoLevel as EcoLevel,
        trustScore: acc.trustScore,
        trustBand: acc.trustBand as TrustBand,
        isActive: true,
      },
    });

    if (acc.role === UserRole.RIDE_SEEKER) {
      await prisma.rideSeeker.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id } });
    }
    if (acc.role === UserRole.ADMIN) {
      await prisma.rideSeeker.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id } });
      await prisma.rideGiver.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id } });
    }
    if (acc.role === UserRole.RIDE_GIVER) {
      const giver = await prisma.rideGiver.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id } });
      if (acc.email === 'raju@raju.com') {
        await prisma.vehicle.upsert({
          where: { plateNumber: 'TS07RJ1234' },
          update: { rideGiverId: giver.id, rcVerified: true },
          create: { rideGiverId: giver.id, make: 'Honda', model: 'City', color: 'Blue', plateNumber: 'TS07RJ1234', totalSeats: 4, rcVerified: true },
        });
      }
      if (acc.email === 'venky@venky.com') {
        await prisma.vehicle.upsert({
          where: { plateNumber: 'TS07VK5678' },
          update: { rideGiverId: giver.id, rcVerified: true },
          create: { rideGiverId: giver.id, make: 'Hyundai', model: 'i20', color: 'Red', plateNumber: 'TS07VK5678', totalSeats: 4, rcVerified: true },
        });
      }
      if (acc.email === 'harish@harish.com') {
        await prisma.vehicle.upsert({
          where: { plateNumber: 'TS08HR9012' },
          update: { rideGiverId: giver.id, rcVerified: true },
          create: { rideGiverId: giver.id, make: 'Toyota', model: 'Innova', color: 'Silver', plateNumber: 'TS08HR9012', totalSeats: 6, rcVerified: true },
        });
      }
    }

    // Emergency contact
    await prisma.emergencyContact.upsert({
      where: { id: acc.emergency.id },
      update: {},
      create: { id: acc.emergency.id, userId: u.id, name: acc.emergency.name, phone: acc.emergency.phone, relationship: acc.emergency.relationship },
    }).catch(() => prisma.emergencyContact.findFirst({ where: { userId: u.id } }));

    console.log(`✅ Test account: ${acc.email} (${acc.role})`);
  }

  // ── Gamification points ────────────────────────────────────────────────
  for (const [user, pts] of [[arjun, 60], [rahul, 180], [tapaswini, 60]] as const) {
    const exists = await prisma.gamificationPoint.findFirst({ where: { userId: user.id, eventType: 'SEED_DATA' } });
    if (!exists) {
      await prisma.gamificationPoint.create({ data: { userId: user.id, eventType: 'SEED_DATA', points: pts, co2SavedG: pts * 80 } });
    }
  }
  console.log('✅ ECO points seeded');

  console.log('\n🚀 Seed complete!\n');
  console.log('Test accounts (all use password: TechieRide@2024)');
  console.log('  Admin  : admin@techieride.in');
  console.log('  Seeker : arjun@tcs.com | tapaswini@tapaswini.com');
  console.log('  Giver  : rahul@rahul.com');
  console.log('\n  Dev-only test accounts:');
  console.log('  Admin  : csr@csr.com');
  console.log('  Seeker : raghu@raghu.com');
  console.log('  Giver  : raju@raju.com | venky@venky.com | harish@harish.com');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
