# TechieRide QA Test Strategy

**Version:** 2.1  **Owner:** QA Lead  **Last Updated:** 2026-06-02

---

## 1. Objectives

| Objective | Target |
|---|---|
| Prevent production defects | Zero P0/P1 bugs in production |
| API test coverage | 100% of API endpoints exercised |
| Security validation | All OWASP Top-10 checks automated |
| CI gate reliability | Build blocks on any critical failure |
| Regression speed | Full suite < 15 min on CI |

---

## 2. Testing Pyramid

```
                    ┌─────────────┐
                    │  Security   │  Level 5 — OWASP, JWT attacks, privilege escalation
                    ├─────────────┤
                  ┌─┤     E2E     ├─┐  Level 4 — Playwright (78 tests across 9 specs)
                  │ └─────────────┘ │
                ┌─┤   API Tests    ├─┐  Level 3 — 215 tests across 6 suites
                │ └─────────────────┘ │
              ┌─┤  Integration Tests  ├─┐  Level 2 — completeFullRide(), verification flows
              │ └─────────────────────┘ │
            ┌─┤       Unit Tests        ├─┐  Level 1 — service helpers, pure functions
            │ └─────────────────────────┘ │
```

### Current Coverage by Level

| Level | Tests | Tool | Status |
|---|---|---|---|
| Unit | ~30 (via API helpers) | ts-node | ✅ Active |
| Integration | ~40 (full ride lifecycle) | ts-node | ✅ Active |
| API | 215 | ts-node custom runner | ✅ Active |
| E2E Functional | 78 | Playwright / Chromium | ✅ Active |
| E2E Security | 20 | Playwright / Chromium | ✅ Active |
| API Security | 35 | ts-node custom runner | ✅ Active |
| Performance | Smoke / Load / Stress | k6 | ✅ Scripts ready |

---

## 3. Test Suites

### 3.1 API Test Suites (`npm run test:api:*`)

| Script | File | Tests | Focus |
|---|---|---|---|
| `test:api` | `e2e-api.ts` | 37 | Core ride lifecycle |
| `test:api:extended` | `e2e-api-extended.ts` | 30 | Pagination, filters, edge cases |
| `test:api:negative` | `e2e-api-negative.ts` | 30 | Invalid inputs, boundary conditions |
| `test:api:rules` | `e2e-api-business-rules.ts` | 44 | Business constraint validation |
| `test:api:coverage` | `e2e-api-coverage.ts` | 69 | Production gap coverage |
| `test:api:final` | `e2e-api-final.ts` | ~35 | End-to-end scenario completion |
| `test:api:security` | `e2e-api-security.ts` | 35 | OWASP, JWT attacks, auth bypass |

### 3.2 Playwright E2E Specs (`npm run test:ui`)

| Spec | Tests | Focus |
|---|---|---|
| `auth.spec.ts` | 9 | Login, signup, validation, redirects |
| `admin.spec.ts` | 6 | Admin dashboard, KPI, role guard |
| `giver.spec.ts` | 7 | Ride creation, offer flow, My Rides |
| `seeker.spec.ts` | 7 | Search, booking, leaderboard |
| `requests.spec.ts` | 9 | Approval, rejection, status colours |
| `mobile.spec.ts` | 14 | Responsive layout, bottom nav, flows |
| `permission-leaks.spec.ts` | 18 | AuthZ boundaries, role leakage |
| `verification-bypass.spec.ts` | 5 | Security bypass, unverified access |
| `security.spec.ts` | 20 | XSS, CSRF, data exposure, session mgmt |

### 3.3 Performance Tests (`k6`)

| Script | VUs | Duration | Purpose |
|---|---|---|---|
| `k6-smoke.js` | 1 | 1 min | Verify API is alive |
| `k6-load.js` | 0→100→0 | 8 min | Normal production load |
| `k6-stress.js` | 0→1000→0 | 17 min | Find breaking point |

---

## 4. CI/CD Pipeline

```
Push to main
    │
    ▼
┌─────────┐     fail → block
│  Lint   │──────────────────────────────────────────────────────┐
│TypeCheck│                                                        │
└────┬────┘                                                        │
     │ pass                                                         │
     ▼                                                             ▼
┌──────────────┐     fail → block               ┌──────────────────────┐
│  API Tests   │──────────────────────────────► │   Quality Gate       │
│  (215 tests) │                                │   (all must pass)    │
└──────┬───────┘                                └──────────────────────┘
       │ pass                                             ▲
       ├──────────────────────────┐                       │
       ▼                          ▼                       │
┌──────────────┐    ┌────────────────────┐               │
│  Security    │    │  Playwright E2E    │               │
│  Tests (35)  │    │  (78 + 20 tests)   │───────────────┘
└──────────────┘    └────────────────────┘
```

### Quality Gates

| Gate | Condition | Action |
|---|---|---|
| Lint | Any ESLint error | ❌ Block |
| TypeScript | Any type error | ❌ Block |
| API Tests | Any test failure | ❌ Block |
| Security Tests | Any failure | ❌ Block (zero tolerance) |
| E2E Tests | Any failure | ❌ Block |
| All gates | All pass | ✅ Allow deploy |

---

## 5. Test Data Strategy

### Seed Accounts (always present)

| Email | Role | Purpose |
|---|---|---|
| `admin@techieride.in` | ADMIN | Admin flow tests |
| `priya@infosys.com` | RIDE_GIVER | Giver flow, RC verified |
| `raju@raju.com` | RIDE_GIVER | Second giver |
| `arjun@tcs.com` | RIDE_SEEKER | Seeker flows |
| `ravi@wipro.com` | BOTH | Dual-role tests |
| `raghu@raghu.com` | RIDE_SEEKER | Call button tests |
| `venky@venky.com` | BOTH | Additional BOTH tests |

### Dynamic Test Accounts

- Each test suite creates `fresh_giver_*@wipro.com` and `fresh_seeker_*@tcs.com` accounts
- Pattern: `{prefix}_{Date.now()}@{domain}`
- Avoids test isolation issues — each suite is fully independent

### Database Reset

```bash
# Full reset between test runs (CI does this automatically)
npm run db:push -- --accept-data-loss
npm run db:seed
```

---

## 6. Test Environments

| Environment | Purpose | Database | API URL |
|---|---|---|---|
| Local | Developer testing | Local PostgreSQL | `localhost:3001` |
| CI | Pull request gates | Ephemeral PostgreSQL | `localhost:3001` |
| Staging | Pre-release validation | Neon (staging branch) | Render staging |
| Production | Smoke tests only | Neon (prod) | `techieride-webapp-v2.onrender.com` |

---

## 7. Defect Classification

| Severity | Definition | SLA |
|---|---|---|
| P0 — Critical | Data loss, security breach, auth bypass, production down | Fix immediately |
| P1 — High | Core user flow broken (can't book ride, can't login) | Fix within 24 h |
| P2 — Medium | Feature degraded, workaround exists | Fix within 3 days |
| P3 — Low | UI glitch, cosmetic issue | Fix within sprint |

---

## 8. Missing Areas (Roadmap)

| Area | Gap | Priority |
|---|---|---|
| WebSocket tracking | No automated Socket.io tests | P1 |
| Email delivery | Email flow is mocked in CI | P2 |
| File upload | Full MIME + size validation not in CI (Minio mock) | P2 |
| SOS flow | No automated SOS trigger test | P2 |
| Payment flow | UPI flow is manual | P3 |
| Mobile devices | Only Chromium tested, no real device testing | P3 |
| Accessibility | No a11y assertions (axe-core) | P3 |
