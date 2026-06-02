/**
 * k6 Smoke Test — TechieRide API
 *
 * Purpose : Verify the API is alive and critical paths respond correctly
 *           under minimal load (1 VU, 1 minute).
 *
 * Run     : k6 run tests/performance/k6-smoke.js
 * Env     : API_BASE_URL=https://techieride-webapp-v2.onrender.com/api/v1
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = __ENV.API_BASE_URL || 'http://localhost:3001/api/v1';
const SEEKER_EMAIL = __ENV.SEEKER_EMAIL || 'arjun@tcs.com';
const GIVER_EMAIL  = __ENV.GIVER_EMAIL  || 'priya@infosys.com';
const PASSWORD     = __ENV.TEST_PASSWORD || 'TechieRide@2024';

// Custom metrics
const errorRate   = new Rate('error_rate');
const loginTrend  = new Trend('login_duration_ms');
const searchTrend = new Trend('search_duration_ms');

export const options = {
  vus: 1,
  duration: '1m',
  thresholds: {
    http_req_failed:   ['rate<0.01'],   // < 1% errors
    http_req_duration: ['p(95)<2000'],  // 95% under 2 s
    error_rate:        ['rate<0.01'],
  },
};

function login(email) {
  const res = http.post(`${BASE}/auth/login`,
    JSON.stringify({ email, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  loginTrend.add(res.timings.duration);
  check(res, { 'login 200': (r) => r.status === 200 });
  return res.status === 200 ? res.json('accessToken') : null;
}

export default function () {
  // 1. Health check
  const health = http.get(`${BASE}`);
  check(health, { 'health 200': (r) => r.status === 200 || r.status === 404 });
  errorRate.add(health.status >= 500);

  sleep(0.5);

  // 2. Login as seeker
  const seekerToken = login(SEEKER_EMAIL);
  if (!seekerToken) { errorRate.add(1); return; }

  const seekerHeaders = {
    headers: { Authorization: `Bearer ${seekerToken}`, 'Content-Type': 'application/json' },
  };

  // 3. Get profile
  const me = http.get(`${BASE}/auth/me`, seekerHeaders);
  check(me, { 'profile 200': (r) => r.status === 200 });
  errorRate.add(me.status >= 500);

  sleep(0.5);

  // 4. Search rides
  const date = new Date().toISOString().split('T')[0];
  const search = http.get(
    `${BASE}/rides/search?originLat=17.44&originLng=78.35&destinationLat=17.45&destinationLng=78.37&date=${date}&radiusMeters=5000`,
    seekerHeaders
  );
  searchTrend.add(search.timings.duration);
  check(search, { 'search 200': (r) => r.status === 200 });
  errorRate.add(search.status >= 500);

  sleep(0.5);

  // 5. Get my requests
  const requests = http.get(`${BASE}/ride-requests`, seekerHeaders);
  check(requests, { 'requests 200': (r) => r.status === 200 });
  errorRate.add(requests.status >= 500);

  sleep(0.5);

  // 6. Login as giver
  const giverToken = login(GIVER_EMAIL);
  if (!giverToken) { errorRate.add(1); return; }

  const giverHeaders = {
    headers: { Authorization: `Bearer ${giverToken}`, 'Content-Type': 'application/json' },
  };

  // 7. Get giver vehicles
  const vehicles = http.get(`${BASE}/vehicles/my`, giverHeaders);
  check(vehicles, { 'vehicles 200': (r) => r.status === 200 });
  errorRate.add(vehicles.status >= 500);

  sleep(0.5);

  // 8. Get giver rides
  const rides = http.get(`${BASE}/rides`, giverHeaders);
  check(rides, { 'rides 200': (r) => r.status === 200 });
  errorRate.add(rides.status >= 500);

  sleep(1);
}
