# PROFILE MANAGEMENT SPECIFICATION
> TechieRide Identity Architecture — v1.0

---

## 1. Profile Sections & Field Matrix

### 1.1 Personal Information

| Field | Editable | Validation | Notes |
|---|---|---|---|
| Full Name | ✅ Yes | 2–60 chars, no numbers | Shown publicly |
| Gender | ✅ Yes | MALE / FEMALE / OTHER | |
| Blood Group | ✅ Yes | A+/A-/B+/B-/O+/O-/AB+/AB- | Optional |
| Profile Photo | ✅ Yes | JPG/PNG ≤ 2MB | Stored in MinIO |
| Mobile Number | ⚠️ OTP required | 10-digit Indian | Change triggers OTP |
| Personal Email | ✅ Yes | Any domain | Notifications only |

### 1.2 Company / Work Information

| Field | Editable | Validation | Notes |
|---|---|---|---|
| Official Email | ⚠️ Full reverification | Allowed domain list | Change triggers full email verif. |
| Company Name | ✅ Yes | 2–60 chars | |
| Employee ID | ✅ Yes | Alphanumeric | |
| Home Location | ✅ Yes | Max 15 words | Commute origin |
| Office Location | ✅ Yes | Max 15 words | Commute destination |

### 1.3 Emergency Contact

| Field | Editable | Validation | Notes |
|---|---|---|---|
| Emergency Contact Name | ✅ Yes | 2–60 chars | |
| Emergency Contact Phone | ✅ Yes | 10-digit Indian | |

### 1.4 Ride Preferences (new — not yet implemented)

| Field | Editable | Default | Notes |
|---|---|---|---|
| Music preference | ✅ Yes | No preference | None / Soft / Any |
| AC preference | ✅ Yes | No preference | |
| Conversation preference | ✅ Yes | No preference | Silent / Casual / Chatty |
| Pet allowed | ✅ Yes | No | Giver only |
| Luggage policy | ✅ Yes | Small bags only | Giver only |

### 1.5 Notification Preferences (new — not yet implemented)

| Notification | Channel | Default |
|---|---|---|
| Request received | In-app + Email | ON |
| Request approved | In-app + Email | ON |
| Ride starts | In-app | ON |
| Ride completed | In-app | ON |
| Verification update | Email | ON |
| Platform announcements | Email | OFF |

---

## 2. Role-Dynamic Profile Display

| Section | SEEKER | GIVER | BOTH |
|---|---|---|---|
| Personal Information | ✅ | ✅ | ✅ |
| Company Information | ✅ | ✅ | ✅ |
| Emergency Contact | ✅ | ✅ | ✅ |
| Vehicle Section | ❌ | ✅ | ✅ |
| Driving License | ❌ | ✅ | ✅ |
| RC Details | ❌ | ✅ | ✅ |
| Ride Statistics (given) | ❌ | ✅ | ✅ |
| Ride Statistics (taken) | ✅ | ❌ | ✅ |
| Ride Preferences | ✅ | ✅ | ✅ |
| TRID Member Card | ✅ (if approved) | ✅ | ✅ |

---

## 3. Current Implementation Gaps

| Gap | Priority | Impact |
|---|---|---|
| No ride preferences section | High | UX — givers and seekers can't express preferences |
| No notification preference toggles | High | Spam / missing alerts |
| Profile photo upload UI incomplete | High | Trust & identity |
| Mobile number change requires OTP but no UI | High | Security |
| Official email change has no UI flow | Critical | Company change scenario broken |
| No field-level edit — full form submit only | Medium | UX friction |
| No audit trail shown to user | Medium | Trust |
| Emergency contacts not editable post-signup | High | Safety risk |

---

## 4. Profile Completeness Score (new concept)

Introduce a **profile score** (0–100%) shown on the profile page:

| Section | Weight |
|---|---|
| Email verified | 20% |
| Profile photo added | 10% |
| Emergency contact filled | 15% |
| Home + office location filled | 15% |
| Documents submitted | 20% |
| Ride preferences filled | 10% |
| Personal email added | 10% |

Target: **80%+ before first ride**.

---

## 5. Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-PM-01 | User can update name, gender, blood group, personal email without reverification |
| AC-PM-02 | Official email change triggers new verification email to new address; old email deactivated only after new one verified |
| AC-PM-03 | Mobile number change requires OTP to new number |
| AC-PM-04 | Vehicle section not visible for RIDE_SEEKER role |
| AC-PM-05 | Profile photo change reflected across all user-visible surfaces within one session |
| AC-PM-06 | Profile completeness score updates in real-time as fields are filled |
| AC-PM-07 | Emergency contact must have at least 1 entry to access ride features |

## 6. Test Cases

| ID | Scenario | Expected |
|---|---|---|
| TC-PM-01 | Seeker views profile | Vehicle section absent |
| TC-PM-02 | Update name with numbers | 400 validation error |
| TC-PM-03 | Change official email to non-whitelisted domain | 400 domain not allowed |
| TC-PM-04 | Upload profile photo > 2MB | 400 file too large |
| TC-PM-05 | Remove emergency contact when it's the only one | 400 at least one required |
| TC-PM-06 | Change mobile — wrong OTP | 401 invalid OTP |
| TC-PM-07 | Save ride preferences as seeker | 200 saved |
