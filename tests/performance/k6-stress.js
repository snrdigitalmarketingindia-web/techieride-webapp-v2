/**
 * k6 Stress Test — TechieRide API
 *
 * Pushes the system beyond normal load to find the breaking point.
 * Stages:  100 → 500 → 1000 VUs
 *
 * Run     : k6 run tests/performance/k6-stress.js
 * Warning : Run against a staging environment only. Never run on production.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE     = __ENV.API_BASE_URL  || 'http://localhost:3001/api/v1';
const PASSWORD = __ENV.TEST_PASSWORD || 'TechieRide@2024';

const errorRate    = new Rate('error_rate');
const loginTrend   = new Trend('login_ms', true);
const searchTrend  = new Trend('search_ms', true);

export const options = {
  stages: [
    { duration: '2m', target: 100  },  // warm up
    { duration: '3m', target: 100  },  // sustain 100
    { duration: '2m', target: 500  },  // ramp to 500
    { duration: '3m', target: 500  },  // sustain 500
    { duration: '2m', target: 1000 },  // ramp to 1000
    { duration: '3m', target: 1000 },  // sustain 1000
    { duration: '2m', target: 0    },  // cool down
  ],
  thresholds: {
    http_req_failed:   ['rate<0.10'],   // tolerate up to 10% errors under stress
    http_req_duration: ['p(95)<5000'],  // 5 s max under stress
    error_rate:        ['rate<0.10'],
  },
};

// Rotating test accounts to avoid session conflicts at high VU counts
const ACCOUNTS = [
  'arjun@tcs.com', 'raghu@raghu.com',
  'rahul@rahul.com', 'raju@raju.com', 'rahul@rahul.com',
];

export default function () {
  const email = ACCOUNTS[(__VU - 1) % ACCOUNTS.length];

  // Login
  const loginStart = Date.now();
  const loginRes = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ email, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'stress_login' } }
  );
  loginTrend.add(Date.now() - loginStart);

  const loginOk = check(loginRes, {
    'stress login 200': (r) => r.status === 200,
  });
  errorRate.add(!loginOk);
  if (!loginOk) { sleep(1); return; }

  const token = loginRes.json('accessToken');
  const hdrs  = { headers: { Authorization: `Bearer ${token}` } };

  sleep(0.2);

  // Ride search — highest read load
  const date = new Date().toISOString().split('T')[0];
  const searchStart = Date.now();
  const searchRes = http.get(
    `${BASE}/rides/search?originLat=17.44&originLng=78.35&destinationLat=17.45&destinationLng=78.37&date=${date}&radiusMeters=10000`,
    { ...hdrs, tags: { name: 'stress_search' } }
  );
  searchTrend.add(Date.now() - searchStart);
  check(searchRes, { 'stress search 200 or 429': (r) => r.status === 200 || r.status === 429 });
  errorRate.add(searchRes.status >= 500);

  sleep(0.3);

  // Profile fetch
  const meRes = http.get(`${BASE}/auth/me`, { ...hdrs, tags: { name: 'stress_profile' } });
  check(meRes, { 'stress profile 200': (r) => r.status === 200 });
  errorRate.add(meRes.status >= 500);

  sleep(0.5 + Math.random() * 0.5);
}
