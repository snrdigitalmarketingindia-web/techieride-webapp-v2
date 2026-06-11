/**
 * Shared test helpers for all e2e-api-*.ts suites.
 *
 * Verification now uses a single identity approval track:
 *   1. Identity verification → POST /verification/identity → SEEKER_VERIFIED + TRID
 *   2. Driver verification   → POST /verification/driver  → DRIVER_VERIFIED (givers only)
 *
 * freshGiver()  → register → approveIdentity → approveDriver → add vehicle → verify RC
 * freshSeeker() → register → approveIdentity
 */

import axios, { AxiosInstance } from 'axios';

export const BASE = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';
export const SEED_PASSWORD = 'TechieRide@2024';
const ADMIN_EMAIL = 'admin@techieride.in';

// ── Primitives ─────────────────────────────────────────────────────────────

export function makeClient(token?: string): AxiosInstance {
  return axios.create({
    baseURL: BASE,
    validateStatus: () => true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function loginAs(email: string, password = SEED_PASSWORD) {
  const r = await makeClient().post('/auth/login', { email, password });
  if (r.status !== 200) throw new Error(`Login failed for ${email}: ${JSON.stringify(r.data)}`);
  const payload = JSON.parse(Buffer.from(r.data.accessToken.split('.')[1], 'base64').toString());
  return {
    token: r.data.accessToken as string,
    refreshToken: r.data.refreshToken as string,
    userId: payload.sub as string,
  };
}

export async function getAdminClient(): Promise<AxiosInstance> {
  const { token } = await loginAs(ADMIN_EMAIL);
  return makeClient(token);
}

/**
 * Register a new account with minimal required fields.
 * Role is no longer set at registration — everyone starts as RIDE_SEEKER.
 * Returns { token, refreshToken, userId }.
 * Safe to call repeatedly — 409 (duplicate) falls back to loginAs.
 */
export async function register(
  email: string,
  fullName: string,
  _roleIgnored?: string,  // kept for signature compatibility — ignored
): Promise<{ token: string; refreshToken: string; userId: string }> {
  const phone = `9${String(Date.now()).slice(-9)}`;
  const r = await makeClient().post('/auth/register', {
    email,
    password: SEED_PASSWORD,
    fullName,
    companyName: 'TestCorp',
    employeeId: 'N/A',
    phone,
  });
  if (r.status !== 201 && r.status !== 409) {
    throw new Error(`Register failed for ${email}: ${JSON.stringify(r.data)}`);
  }
  return loginAs(email);
}

// ── Verification helpers ───────────────────────────────────────────────────

/**
 * Submit identity docs (company ID + govt ID + self-declaration) and have
 * admin approve → accountStatus: SEEKER_VERIFIED + TRID assigned.
 */
export async function approveIdentityVerification(
  userId: string,
  userClient: AxiosInstance,
  adminClient: AxiosInstance,
) {
  const submit = await userClient.post('/verification/identity', {
    employeeIdUrl: 'https://mock.storage/emp-id.jpg',
    govtIdUrl: 'https://mock.storage/govt-id.jpg',
    selfDeclarationAccepted: true,
  });
  if (![200, 201].includes(submit.status)) {
    throw new Error(`Identity verification submit failed: ${JSON.stringify(submit.data)}`);
  }

  const queue = await adminClient.get('/admin/verification/pending');
  if (queue.status !== 200) throw new Error(`Could not fetch verification queue: ${JSON.stringify(queue.data)}`);

  const entry = queue.data.find((v: any) => v.userId === userId && v.verificationType === 'IDENTITY');
  if (!entry) throw new Error(`Identity verification entry for userId ${userId} not found`);

  const review = await adminClient.patch(`/admin/verification/${entry.id}/review`, { decision: 'APPROVED' });
  if (review.status !== 200) throw new Error(`Identity verification approval failed: ${JSON.stringify(review.data)}`);
}

/**
 * Legacy alias — old tests calling approveEmployeeVerification() still work.
 */
export const approveEmployeeVerification = approveIdentityVerification;

/**
 * Submit driver docs and have admin approve → accountStatus: DRIVER_VERIFIED, role: RIDE_GIVER
 * Requires user to already be SEEKER_VERIFIED.
 */
export async function approveDriverVerification(
  userId: string,
  userClient: AxiosInstance,
  adminClient: AxiosInstance,
) {
  // Create a vehicle first — required since vehicleId is now mandatory on driver verification
  const ts = Date.now();
  const veh = await userClient.post('/vehicles', {
    make: 'Honda', model: 'City', color: 'Silver',
    plateNumber: `VDV${ts.toString().slice(-6)}`,
    totalSeats: 4,
  });
  if (![200, 201].includes(veh.status)) {
    throw new Error(`Could not create vehicle for driver verification: ${JSON.stringify(veh.data)}`);
  }
  const vehicleId: string = veh.data.id;
  await userClient.patch(`/vehicles/${vehicleId}/rc`, { rcUrl: 'https://mock.storage/rc.jpg' });

  const submit = await userClient.post('/verification/driver', {
    drivingLicenseUrl: 'https://mock.storage/dl.jpg',
    rcUrl: 'https://mock.storage/rc.jpg',
    vehicleId,
  });
  if (![200, 201].includes(submit.status)) {
    throw new Error(`Driver verification submit failed: ${JSON.stringify(submit.data)}`);
  }

  const queue = await adminClient.get('/admin/verification/pending');
  if (queue.status !== 200) throw new Error(`Could not fetch verification queue: ${JSON.stringify(queue.data)}`);

  const entry = queue.data.find((v: any) => v.userId === userId && v.verificationType === 'DRIVER');
  if (!entry) throw new Error(`Driver verification entry for userId ${userId} not found`);

  const review = await adminClient.patch(`/admin/verification/${entry.id}/review`, { decision: 'APPROVED' });
  if (review.status !== 200) throw new Error(`Driver verification approval failed: ${JSON.stringify(review.data)}`);
}

/**
 * Legacy alias — kept so old test code that calls approveVerification() still compiles.
 * Runs the full 2-step flow (identity + driver).
 */
export async function approveVerification(
  userId: string,
  userClient: AxiosInstance,
  adminClient: AxiosInstance,
) {
  await approveIdentityVerification(userId, userClient, adminClient);
  await approveDriverVerification(userId, userClient, adminClient);
}

/**
 * Admin verifies a vehicle's RC (sets rcVerified = true).
 */
export async function approveVehicleRc(vehicleId: string, adminClient: AxiosInstance) {
  const r = await adminClient.patch(`/admin/vehicles/${vehicleId}/verify`);
  if (r.status !== 200) throw new Error(`Vehicle RC verify failed: ${JSON.stringify(r.data)}`);
}

// ── Fresh account factories ────────────────────────────────────────────────

/**
 * Create a fully verified giver ready to publish rides.
 *
 * 1. Register (starts as RIDE_SEEKER)
 * 2. Identity verification → SEEKER_VERIFIED + TRID
 * 3. Driver verification   → DRIVER_VERIFIED, role → RIDE_GIVER
 * 4. Add vehicle
 * 5. Admin verifies vehicle RC
 */
export async function freshGiver(suffix: string) {
  const ts = Date.now();
  const email = `h_giver_${suffix}_${ts}@wipro.com`;

  const acc = await register(email, `Giver ${suffix}`);
  const client = makeClient(acc.token);
  const adminClient = await getAdminClient();

  await approveIdentityVerification(acc.userId, client, adminClient);
  await approveDriverVerification(acc.userId, client, adminClient);

  const veh = await client.post('/vehicles', {
    make: 'Honda',
    model: 'City',
    color: 'Silver',
    plateNumber: `HLP${ts.toString().slice(-6)}`,
    totalSeats: 4,
  });
  if (veh.status !== 201) throw new Error(`Vehicle creation failed: ${JSON.stringify(veh.data)}`);
  const vehicleId = veh.data.id as string;

  await approveVehicleRc(vehicleId, adminClient);

  return { client, token: acc.token, userId: acc.userId, vehicleId, refreshToken: acc.refreshToken };
}

/**
 * Create a fresh verified seeker (SEEKER_VERIFIED + TRID).
 */
export async function freshSeeker(suffix: string) {
  const ts = Date.now();
  const email = `h_seeker_${suffix}_${ts}@tcs.com`;

  const acc = await register(email, `Seeker ${suffix}`);
  const client = makeClient(acc.token);
  const adminClient = await getAdminClient();

  await approveIdentityVerification(acc.userId, client, adminClient);

  return { client, token: acc.token, userId: acc.userId, refreshToken: acc.refreshToken };
}

/**
 * Publish a ride for a verified giver. Returns rideId.
 */
export async function publishRide(giverClient: AxiosInstance, vehicleId: string, seats = 3): Promise<string> {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const r = await giverClient.post('/rides', {
    vehicleId,
    originName: 'Kondapur',
    originLat: 17.44,
    originLng: 78.34,
    destinationName: 'HITEC City',
    destinationLat: 17.45,
    destinationLng: 78.36,
    departureDate: tomorrow,
    departureTime: '09:00',
    totalSeats: seats,
  });
  if (r.status !== 201) throw new Error(`Create ride failed: ${JSON.stringify(r.data)}`);
  const pub = await giverClient.patch(`/rides/${r.data.id}/publish`);
  if (pub.status !== 200) throw new Error(`Publish failed: ${JSON.stringify(pub.data)}`);
  return r.data.id as string;
}

/**
 * Run a full ride lifecycle: publish → request → approve → confirm → start → board → deboard → complete.
 */
export async function completeFullRide(seats = 1) {
  const giver  = await freshGiver('lifecycle');
  const seeker = await freshSeeker('lifecycle');
  const rideId = await publishRide(giver.client, giver.vehicleId, seats);

  const reqR = await seeker.client.post('/ride-requests', { rideId, pickupName: 'Kondapur Metro, Hyderabad' });
  if (reqR.status !== 201) throw new Error(`Request failed: ${JSON.stringify(reqR.data)}`);
  const reqId = reqR.data.requestId as string;

  const approve = await giver.client.patch(`/ride-requests/${reqId}/approve`);
  if (approve.status !== 200) throw new Error(`Approve failed: ${JSON.stringify(approve.data)}`);

  const confirm = await seeker.client.patch(`/ride-requests/${reqId}/confirm`);
  if (confirm.status !== 200) throw new Error(`Confirm failed: ${JSON.stringify(confirm.data)}`);

  const start = await giver.client.patch(`/rides/${rideId}/start`);
  if (start.status !== 200) throw new Error(`Start failed: ${JSON.stringify(start.data)}`);

  const board = await seeker.client.patch(`/rides/${rideId}/board`);
  if (board.status !== 200) throw new Error(`Board failed: ${JSON.stringify(board.data)}`);

  const deboard = await seeker.client.patch(`/rides/${rideId}/deboard`);
  if (deboard.status !== 200) throw new Error(`Deboard failed: ${JSON.stringify(deboard.data)}`);

  const complete = await giver.client.patch(`/rides/${rideId}/complete`);
  if (complete.status !== 200) throw new Error(`Complete failed: ${JSON.stringify(complete.data)}`);

  return { giver, seeker, rideId, reqId };
}
