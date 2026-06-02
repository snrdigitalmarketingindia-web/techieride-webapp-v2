/**
 * k6 Load Test — TechieRide API
 *
 * Simulates realistic production traffic across 3 stages:
 *   Stage 1 — Ramp up   :  0 → 100 VUs over 2 min
 *   Stage 2 — Sustain   : 100 VUs for 5 min
 *   Stage 3 — Ramp down : 100 → 0 VUs over 1 min
 *
 * Run     : k6 run tests/performance/k6-load.js
 * Report  : k6 run --out json=tests/performance/results/load.json tests/performance/k6-load.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE     = __ENV.API_BASE_URL  || 'http://localhost:3001/api/v1';
const PASSWORD = __ENV.TEST_PASSWORD || 'TechieRide@2024';

// Seed accounts — must be pre-seeded in the target DB
const SEEKERS = [
  'arjun@tcs.com',
  'raghu@raghu.com',
];
const GIVERS = [
  'priya@infosys.com',
  'raju@raju.com',
];

// Custom metrics
const errorRate     = new Rate('error_rate');
const loginDuration = new Trend('login_p95_ms', true);
const searchDuration = new Trend('search_p95_ms', true);
const requestsDuration = new Trend('requests_p95_ms', true);
const failedLogins  = new Counter('failed_logins');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // ramp up to 100 VUs
    { duration: '5m', target: 100 },   // sustain 100 VUs
    { duration: '1m', target: 0   },   // ramp down
  ],
  thresholds: {
    // Quality gates — build fails if these are breached
    http_req_failed:      ['rate<0.05'],   // < 5% HTTP errors
    http_req_duration:    ['p(95)<3000'],  // 95th percentile < 3 s
    'login_p95_ms':       ['p(95)<2000'],  // login < 2 s
    'search_p95_ms':      ['p(95)<2500'],  // search < 2.5 s
    'requests_p95_ms':    ['p(95)<2000'],  // requests list < 2 s
    error_rate:           ['rate<0.05'],
  },
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function login(email) {
  const start = Date.now();
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ email, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } }
  );
  loginDuration.add(Date.now() - start);

  const ok = check(res, {
    'login status 200': (r) => r.status === 200,
    'login has token':  (r) => !!r.json('accessToken'),
  });

  if (!ok) { failedLogins.add(1); return null; }
  return res.json('accessToken');
}

export default function () {
  const isGiver = Math.random() < 0.3; // 30% givers, 70% seekers
  const email   = isGiver ? pickRandom(GIVERS) : pickRandom(SEEKERS);

  // ── Login ──────────────────────────────────────────────────────────────────
  const token = login(email);
  if (!token) { errorRate.add(1); sleep(1); return; }

  const hdrs = {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  };

  sleep(0.3);

  // ── Profile fetch ──────────────────────────────────────────────────────────
  group('profile', () => {
    const r = http.get(`${BASE}/auth/me`, { ...hdrs, tags: { name: 'profile' } });
    check(r, { 'profile 200': (r) => r.status === 200 });
    errorRate.add(r.status >= 500);
  });

  sleep(0.2);

  // ── Ride search (all users) ────────────────────────────────────────────────
  group('ride_search', () => {
    const date  = new Date().toISOString().split('T')[0];
    const start = Date.now();
    const r = http.get(
      `${BASE}/rides/search?originLat=17.44&originLng=78.35&destinationLat=17.45&destinationLng=78.37&date=${date}&radiusMeters=10000`,
      { ...hdrs, tags: { name: 'ride_search' } }
    );
    searchDuration.add(Date.now() - start);
    check(r, {
      'search 200':         (r) => r.status === 200,
      'search returns list': (r) => Array.isArray(r.json('rides') ?? r.json()),
    });
    errorRate.add(r.status >= 500);
  });

  sleep(0.5);

  if (isGiver) {
    // ── Giver flows ────────────────────────────────────────────────────────
    group('giver_rides', () => {
      const r = http.get(`${BASE}/rides`, { ...hdrs, tags: { name: 'giver_rides' } });
      check(r, { 'given rides 200': (r) => r.status === 200 });
      errorRate.add(r.status >= 500);
    });

    sleep(0.3);

    group('giver_vehicles', () => {
      const r = http.get(`${BASE}/vehicles/my`, { ...hdrs, tags: { name: 'giver_vehicles' } });
      check(r, { 'vehicles 200': (r) => r.status === 200 });
      errorRate.add(r.status >= 500);
    });

  } else {
    // ── Seeker flows ───────────────────────────────────────────────────────
    group('my_requests', () => {
      const start = Date.now();
      const r = http.get(`${BASE}/ride-requests`, { ...hdrs, tags: { name: 'my_requests' } });
      requestsDuration.add(Date.now() - start);
      check(r, { 'requests 200': (r) => r.status === 200 });
      errorRate.add(r.status >= 500);
    });

    sleep(0.3);

    group('gamification', () => {
      const r = http.get(`${BASE}/gamification/summary`, { ...hdrs, tags: { name: 'gamification' } });
      check(r, { 'gamification 200': (r) => r.status === 200 });
      errorRate.add(r.status >= 500);
    });
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  group('notifications', () => {
    const r = http.get(`${BASE}/notifications?unreadOnly=true`, { ...hdrs, tags: { name: 'notifications' } });
    check(r, { 'notifications 200': (r) => r.status === 200 });
    errorRate.add(r.status >= 500);
  });

  sleep(1 + Math.random());   // 1–2 s think time between iterations
}

export function handleSummary(data) {
  return {
    'tests/performance/results/load-summary.txt': textSummary(data, { indent: '  ', enableColors: false }),
  };
}

function textSummary(data, opts) {
  const { metrics } = data;
  const lines = ['TechieRide Load Test Summary', '='.repeat(40)];
  const key = (k) => metrics[k];
  lines.push(`http_req_duration p(95) : ${key('http_req_duration')?.values?.['p(95)']?.toFixed(0)} ms`);
  lines.push(`http_req_failed         : ${(key('http_req_failed')?.values?.rate * 100)?.toFixed(2)}%`);
  lines.push(`login_p95_ms p(95)      : ${key('login_p95_ms')?.values?.['p(95)']?.toFixed(0)} ms`);
  lines.push(`search_p95_ms p(95)     : ${key('search_p95_ms')?.values?.['p(95)']?.toFixed(0)} ms`);
  lines.push(`failed_logins           : ${key('failed_logins')?.values?.count ?? 0}`);
  lines.push(`error_rate              : ${(key('error_rate')?.values?.rate * 100)?.toFixed(2)}%`);
  return lines.join('\n');
}
