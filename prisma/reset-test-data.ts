/**
 * reset-test-data.ts
 *
 * Wipes all transactional/test data from the database while keeping seed
 * user accounts intact, then re-applies the correct verification flags so
 * every test account is in the expected "fully verified" state.
 *
 * Run:  npm run db:reset
 *
 * What gets DELETED:
 *   - All rides (+ cascade: requests, participants)
 *   - All commute templates
 *   - All notifications
 *   - All gamification points (reset to seed values below)
 *   - All trust-score events (reset scores on users below)
 *   - All ride ratings
 *   - All SOS events
 *   - All complaints
 *   - All call logs
 *   - All audit logs
 *   - All saved locations
 *   - Any vehicles NOT in the seed list (test-created extras)
 *
 * What gets PRESERVED + RESET:
 *   - User accounts (profile fields untouched; auth/status flags reset)
 *   - Seed vehicles (rcVerified = true, isActive = true)
 *   - Emergency contacts
 *   - Verification requests (status reset to APPROVED)
 *   - RideGiver records (licenseVerified = true)
 */

import {
  PrismaClient,
  UserRole,
  VerificationStatus,
  AccountStatus,
  EcoLevel,
  TrustBand,
} from '@prisma/client';

const prisma = new PrismaClient();

// ── Seed vehicles ─────────────────────────────────────────────────────────────
// Only these plate numbers belong to seeded givers. Any other vehicle was
// created during testing and should be removed.
const SEED_PLATE_NUMBERS = [
  'TS09AB5678', // Rahul  — Maruti Swift
  'TS07RJ1234', // Raju   — Honda City
  'TS07VK5678', // Venky  — Hyundai i20
  'TS08HR9012', // Harish — Toyota Innova
];

// ── Seed eco/trust values (mirrors seed.ts) ───────────────────────────────────
const USER_SEED_VALUES: Record<string, {
  ecoPoints: number; ecoLevel: EcoLevel;
  trustScore: number; trustBand: TrustBand;
}> = {
  'admin@techieride.in': { ecoPoints: 500, ecoLevel: EcoLevel.LEAF,   trustScore: 85, trustBand: TrustBand.PLATINUM },
  'arjun@tcs.com':       { ecoPoints: 60,  ecoLevel: EcoLevel.SEED,   trustScore: 35, trustBand: TrustBand.BRONZE   },
  'tapaswini@tapaswini.com': { ecoPoints: 60, ecoLevel: EcoLevel.SEED, trustScore: 30, trustBand: TrustBand.BRONZE  },
  'rahul@rahul.com':     { ecoPoints: 180, ecoLevel: EcoLevel.SPROUT, trustScore: 55, trustBand: TrustBand.SILVER   },
  'csr@csr.com':         { ecoPoints: 120, ecoLevel: EcoLevel.SPROUT, trustScore: 50, trustBand: TrustBand.SILVER   },
  'raghu@raghu.com':     { ecoPoints: 40,  ecoLevel: EcoLevel.SEED,   trustScore: 25, trustBand: TrustBand.BRONZE   },
  'raju@raju.com':       { ecoPoints: 220, ecoLevel: EcoLevel.SPROUT, trustScore: 60, trustBand: TrustBand.SILVER   },
  'venky@venky.com':     { ecoPoints: 310, ecoLevel: EcoLevel.LEAF,   trustScore: 70, trustBand: TrustBand.GOLD     },
  'harish@harish.com':   { ecoPoints: 150, ecoLevel: EcoLevel.SPROUT, trustScore: 45, trustBand: TrustBand.SILVER   },
};

async function main() {
  console.log('🧹 TechieRide — Reset Test Data\n');

  // ── 1. Delete transactional data (FK-safe order) ─────────────────────────
  console.log('🗑  Clearing transactional data...');

  // Delete in FK-safe order (children before parents).
  // Each call is wrapped with .catch(() => ({ count: 0 })) so that tables
  // which exist in the schema but haven't been pushed to the DB yet are
  // silently skipped rather than crashing the whole reset.
  const skip = { count: 0 };
  const trustEvents   = await prisma.trustScoreEvent.deleteMany().catch(() => skip);
  const gamPoints     = await prisma.gamificationPoint.deleteMany().catch(() => skip);
  const ratings       = await prisma.rideRating.deleteMany().catch(() => skip);
  const sos           = await prisma.sosEvent.deleteMany().catch(() => skip);
  const complaints    = await prisma.complaint.deleteMany().catch(() => skip);
  const notifications = await prisma.notification.deleteMany().catch(() => skip);
  const callLogs      = await prisma.callLog.deleteMany().catch(() => skip);
  const auditLogs     = await prisma.auditLog.deleteMany().catch(() => skip);
  const participants  = await prisma.rideParticipant.deleteMany().catch(() => skip);
  const requests      = await prisma.rideRequest.deleteMany().catch(() => skip);
  const rides         = await prisma.ride.deleteMany().catch(() => skip);
  const templates     = await prisma.commuteTemplate.deleteMany().catch(() => skip);
  // SavedLocation: use raw SQL — Prisma client may not be regenerated after
  // this model was added to schema, so prisma.savedLocation may be undefined.
  const savedLocsResult = await prisma.$executeRawUnsafe(
    'DELETE FROM saved_locations'
  ).catch(() => 0);

  console.log(`   ✔ trust_score_events   : ${trustEvents.count}`);
  console.log(`   ✔ gamification_points  : ${gamPoints.count}`);
  console.log(`   ✔ ride_ratings         : ${ratings.count}`);
  console.log(`   ✔ sos_events           : ${sos.count}`);
  console.log(`   ✔ complaints           : ${complaints.count}`);
  console.log(`   ✔ notifications        : ${notifications.count}`);
  console.log(`   ✔ call_logs            : ${callLogs.count}`);
  console.log(`   ✔ audit_logs           : ${auditLogs.count}`);
  console.log(`   ✔ ride_participants    : ${participants.count}`);
  console.log(`   ✔ ride_requests        : ${requests.count}`);
  console.log(`   ✔ rides                : ${rides.count}`);
  console.log(`   ✔ commute_templates    : ${templates.count}`);
  console.log(`   ✔ saved_locations      : ${savedLocsResult}`);

  // ── 2. Remove test-created vehicles (keep seed list only) ────────────────
  const deletedVehicles = await prisma.vehicle.deleteMany({
    where: { plateNumber: { notIn: SEED_PLATE_NUMBERS } },
  });
  console.log(`\n🚗 Deleted test vehicles    : ${deletedVehicles.count}`);

  // Reset seed vehicles to fully-verified, active state
  await prisma.vehicle.updateMany({
    where: { plateNumber: { in: SEED_PLATE_NUMBERS } },
    data: { rcVerified: true, isActive: true } as any,
  });
  console.log('   ✔ Seed vehicles reset to rcVerified=true, isActive=true');

  // ── 3. Reset RideGiver flags ──────────────────────────────────────────────
  await prisma.rideGiver.updateMany({
    data: { licenseVerified: true, isAvailable: true },
  });
  console.log('\n🧑‍✈️  All RideGiver.licenseVerified → true');

  // ── 4. Reset verification requests → APPROVED ────────────────────────────
  await prisma.verificationRequest.updateMany({
    data: { status: VerificationStatus.APPROVED, rejectionReason: null },
  });
  console.log('✅  All verification requests → APPROVED');

  // ── 5. Reset user flags (auth + eco + trust) via raw SQL ────────────────
  // Raw SQL avoids Prisma enum deserialization errors (e.g. stale 'BOTH' role
  // value in the DB that no longer exists in the schema enum).
  console.log('\n👤  Resetting user flags...');

  // Per-account updates with correct accountStatus per role
  const accountUpdates: Array<{ email: string; accountStatus: string }> = [
    { email: 'admin@techieride.in',       accountStatus: 'EMPLOYEE_VERIFIED' },
    { email: 'csr@csr.com',               accountStatus: 'EMPLOYEE_VERIFIED' },
    { email: 'arjun@tcs.com',             accountStatus: 'EMPLOYEE_VERIFIED' },
    { email: 'tapaswini@tapaswini.com',   accountStatus: 'EMPLOYEE_VERIFIED' },
    { email: 'raghu@raghu.com',           accountStatus: 'EMPLOYEE_VERIFIED' },
    { email: 'rahul@rahul.com',           accountStatus: 'DRIVER_VERIFIED'   },
    { email: 'raju@raju.com',             accountStatus: 'DRIVER_VERIFIED'   },
    { email: 'venky@venky.com',           accountStatus: 'DRIVER_VERIFIED'   },
    { email: 'harish@harish.com',         accountStatus: 'DRIVER_VERIFIED'   },
  ];

  for (const { email, accountStatus } of accountUpdates) {
    const seedVals = USER_SEED_VALUES[email];
    if (!seedVals) continue;

    // Core flags — present in all DB versions
    await prisma.$executeRawUnsafe(`
      UPDATE users SET
        "accountStatus"      = $1::"AccountStatus",
        "verificationStatus" = 'APPROVED'::"VerificationStatus",
        "isActive"           = true
      WHERE email = $2
    `, accountStatus, email);

    // emailStatus — cast as text in case the enum type name differs
    await prisma.$executeRawUnsafe(
      `UPDATE users SET "emailStatus" = 'VERIFIED' WHERE email = $1`, email
    ).catch(() => {});

    // Eco points (added in eco feature rollout)
    await prisma.$executeRawUnsafe(
      `UPDATE users SET "ecoPoints" = $1, "ecoLevel" = $2::"EcoLevel" WHERE email = $3`,
      seedVals.ecoPoints, seedVals.ecoLevel, email
    ).catch(() => {});

    // Trust score (added later)
    await prisma.$executeRawUnsafe(
      `UPDATE users SET "trustScore" = $1, "trustBand" = $2::"TrustBand" WHERE email = $3`,
      seedVals.trustScore, seedVals.trustBand, email
    ).catch(() => {});

    // Clear pending email-change tokens
    await prisma.$executeRawUnsafe(
      `UPDATE users SET "pendingEmail" = NULL, "pendingEmailToken" = NULL, "pendingEmailExpiry" = NULL WHERE email = $1`,
      email
    ).catch(() => {});

    // personalEmailVerified (added in personal-email feature)
    await prisma.$executeRawUnsafe(
      `UPDATE users SET "personalEmailVerified" = true WHERE email = $1`, email
    ).catch(() => {});
    console.log(`   ✔ ${email.padEnd(30)} → ${accountStatus}`);
  }

  // Fix any stale 'BOTH' role values from old schema — map to RIDE_GIVER
  const fixedBoth = await prisma.$executeRawUnsafe(
    `UPDATE users SET role = 'RIDE_GIVER'::"UserRole" WHERE role::text = 'BOTH'`
  ).catch(() => 0);
  if (fixedBoth > 0) console.log(`   ✔ Fixed ${fixedBoth} stale BOTH → RIDE_GIVER`);

  // ── 6. Re-seed gamification points (SEED_DATA baseline) ──────────────────
  console.log('\n🌱  Re-seeding gamification baseline points...');
  for (const [email, vals] of Object.entries(USER_SEED_VALUES)) {
    // Fetch user id via raw SQL to avoid enum deserialization issues
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM users WHERE email = $1`, email
    );
    if (!rows.length) continue;
    const userId = rows[0].id;
    await prisma.gamificationPoint.create({
      data: {
        userId,
        eventType: 'SEED_DATA',
        points:    vals.ecoPoints,
        co2SavedG: vals.ecoPoints * 80,
      },
    }).catch(() => {}); // skip if gamification_points table doesn't exist yet
    console.log(`   ✔ ${email} — ${vals.ecoPoints} pts`);
  }

  console.log('\n✅  Reset complete — database is clean and all test accounts are fully verified.\n');
  console.log('Test accounts (password: TechieRide@2024)');
  console.log('  Admin   : admin@techieride.in  |  csr@csr.com');
  console.log('  Seeker  : arjun@tcs.com  |  tapaswini@tapaswini.com  |  raghu@raghu.com');
  console.log('  Giver   : rahul@rahul.com  |  raju@raju.com  |  venky@venky.com  |  harish@harish.com');
  console.log('\nVerification state:');
  console.log('  All givers  → DRIVER_VERIFIED, licenseVerified=true, rcVerified=true');
  console.log('  All seekers → EMPLOYEE_VERIFIED');
  console.log('  All users   → emailStatus=VERIFIED, personalEmailVerified=true');
}

main()
  .catch((e) => { console.error('❌ Reset failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
