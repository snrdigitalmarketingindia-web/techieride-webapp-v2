/**
 * Shared test helpers for all e2e-api-*.ts suites.
 *
 * freshGiver() now goes through the full verification flow:
 *   register → submit docs → admin approves → add vehicle → admin verifies RC
 *
 * This mirrors the real production flow and ensures all tests exercise
 * the verification gate introduced in rides.service.ts publish().
 */

import axios, { AxiosInstance } from 'axios';

export const BASE = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1';

export const SEED_PASSWORD = 'TechieRide@2024';

const ADMIN_EMAIL = 'admin@techieride.in';

// ── Primitives ────────────────────────────────────────────────────────────────

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
 * Register a new account. Returns { token, refreshToken, userId }.
 * Safe to call repeatedly — if 409 (duplicate) it falls back to loginAs.
 */
export async function register(
  email: string,
  fullName: string,
  role: string,
  phone?: string,
): Promise<{ token: string; refreshToken: string; userId: string }> {
  const r = await makeClient().post('/auth/register', {
    email,
    password: SEED_PASSWORD,
    fullName,
    gender: 'MALE',
    companyName: 'TestCorp',
    employeeId: 'N/A',
    role,
    phone: phone ?? '9' + Math.floor(100000000 + Math.random() * 900000000).toString(),
    homeLocation: 'Kondapur, Hyderabad',
    officeLocation: 'HITEC City, Madhapur, Hyderabad',
    emergencyContactName: 'Test Emergency Contact',
    emergencyContactPhone: '9000000001',
  });
  if (r.status !== 201 && r.status !== 409) {
    throw new Error(`Register failed for ${email}: ${JSON.stringify(r.data)}`);
  }
  return loginAs(email);
}

// ── Verification helpers ──────────────────────────────────────────────────────

/**
 * Submit mock verification docs then have admin approve them.
 * After this call, user.verificationStatus === 'APPROVED'.
 */
export async function approveVerification(userId: string, userClient: AxiosInstance, adminClient: AxiosInstance) {
  // Submit docs
  const submit = await userClient.post('/verification/submit', {
    employeeIdUrl: 'https://mock.storage/emp-id.jpg',
    drivingLicenseUrl: 'https://mock.storage/dl.jpg',
    rcUrl: 'https://mock.storage/rc.jpg',
  });
  if (![200, 201].includes(submit.status)) {
    throw new Error(`Verification submit failed: ${JSON.stringify(submit.data)}`);
  }

  // Admin finds + approves
  const queue = await adminClient.get('/admin/verification/pending');
  if (queue.status !== 200) throw new Error(`Could not fetch verification queue: ${JSON.stringify(queue.data)}`);

  const entry = queue.data.find((v: any) => v.userId === userId);
  if (!entry) throw new Error(`Verification entry for userId ${userId} not found in pending queue`);

  const review = await adminClient.patch(`/admin/verification/${entry.id}/review`, { decision: 'APPROVED' });
  if (review.status !== 200) throw new Error(`Verification approval failed: ${JSON.stringify(review.data)}`);
}

/**
 * Admin verifies a vehicle's RC (sets rcVerified = true).
 */
export async function approveVehicleRc(vehicleId: string, adminClient: AxiosInstance) {
  const r = await adminClient.patch(`/admin/vehicles/${vehicleId}/verify`);
  if (r.status !== 200) throw new Error(`Vehicle RC verify failed: ${JSON.stringify(r.data)}`);
}

// ── Fresh account factories ───────────────────────────────────────────────────

/**
 * Create a fully verified giver ready to publish rides.
 *
 * Steps:
 *  1. Register as RIDE_GIVER
 *  2. Submit verification docs → admin approves (verificationStatus = APPROVED)
 *  3. Add a vehicle
 *  4. Admin verifies vehicle RC (rcVerified = true)
 */
export async function freshGiver(suffix: string) {
  const ts = Date.now();
  const email = `h_giver_${suffix}_${ts}@wipro.com`;

  const acc = await register(email, `Giver ${suffix}`, 'RIDE_GIVER');
  const client = makeClient(acc.token);
  const adminClient = await getAdminClient();

  // Full verification flow
  await approveVerification(acc.userId, client, adminClient);

  // Add vehicle
  const veh = await client.post('/vehicles', {
    make: 'Honda',
    model: 'City',
    color: 'Silver',
    plateNumber: `HLP${ts.toString().slice(-6)}`,
    totalSeats: 4,
  });
  if (veh.status !== 201) throw new Error(`Vehicle creation failed: ${JSON.stringify(veh.data)}`);
  const vehicleId = veh.data.id as string;

  // Admin verifies RC
  await approveVehicleRc(vehicleId, adminClient);

  return { client, token: acc.token, userId: acc.userId, vehicleId, refreshToken: acc.refreshToken };
}

/**
 * Create a fresh seeker (seekers don't need verification to request rides).
 */
export async function freshSeeker(suffix: string) {
  const ts = Date.now();
  const email = `h_seeker_${suffix}_${ts}@tcs.com`;
  const acc = await register(email, `Seeker ${suffix}`, 'RIDE_SEEKER');
  return { client: makeClient(acc.token), token: acc.token, userId: acc.userId, refreshToken: acc.refreshToken };
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
 * Run a full ride lifecycle: publish → request → approve → confirm → start → complete.
 * Returns all actors and IDs for assertions.
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
