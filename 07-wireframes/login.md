# Wireframe: Login & Registration — Techie Ride

> **Status:** Placeholder — visual wireframes to be designed in Figma.  
> This document defines the screen structure, components, and UX flow.

---

## Screens in This Flow

1. Splash / Landing
2. Phone Entry
3. OTP Verification
4. Registration Form (new users)
5. Document Upload
6. Pending Verification State

---

## 1. Splash / Landing Screen

**Layout:** Centered, full-screen
- Logo + tagline: *"Carpool with your tribe"*
- CTA: **"Get Started"** button
- Secondary link: "Already have an account? Login"

---

## 2. Phone Entry Screen

**Purpose:** Collect phone number; send OTP

**Components:**
- Header: "Enter your phone number"
- Country code selector (+91 default)
- Phone input (10 digits)
- CTA: **"Send OTP"**
- Subtext: "We'll send a one-time password"

**Validations:**
- 10-digit Indian mobile number
- Disable button until valid

---

## 3. OTP Verification Screen

**Components:**
- Header: "Enter OTP"
- Subtext: "Sent to +91 XXXXXX1234"
- 6-box OTP input (auto-focus next on entry)
- Timer: "Resend OTP in 0:45"
- CTA: **"Verify"**
- "Change number" link

**Behavior:**
- Auto-submit when all 6 digits entered
- Resend enabled after 60 seconds

---

## 4. Registration Form (new user only)

**Triggered when:** Phone is not found in the system after OTP verification.

**Fields (Step 1 — Personal):**
- Full name
- Work email (company domain)
- Gender (radio: Male / Female / Other)

**Fields (Step 2 — Work):**
- Company name (dropdown or text)
- Employee ID

**Fields (Step 3 — Role Selection):**
- "I want to:" toggle
  - [ ] Offer rides (Ride Giver)
  - [ ] Find rides (Ride Seeker)
  - [ ] Both

**CTA:** "Continue to Document Upload"

---

## 5. Document Upload Screen

**Purpose:** Upload identity and driving documents for admin verification.

**For all users:**
- Employee ID photo upload (camera or gallery)
  - Preview thumbnail after upload
  - File size hint: max 5MB, JPG/PNG

**Additional for Ride Givers:**
- Driving License (front + back)
- Vehicle Registration Certificate (RC)

**CTA:** "Submit for Verification"

**Post-submit message:** "Your documents are under review. We'll notify you within 24 hours."

---

## 6. Pending Verification State Screen

**Layout:** Info screen
- Illustration: clock / pending icon
- Header: "Verification in Progress"
- Body: "Our team is reviewing your documents. You'll receive a notification once approved."
- Timeline: estimated 24 hours
- CTA: **"Go to Home"** (limited home with no ride actions)

**If Rejected:**
- Reason displayed
- CTA: **"Re-upload Documents"** → returns to Document Upload screen

---

## Navigation Notes

```
Splash
  → Phone Entry
    → OTP Verify
      → [existing user] → Home Dashboard
      → [new user] → Registration Form
        → Document Upload
          → Pending Verification Screen
            → [approved] → Home Dashboard (full access)
            → [rejected] → Document Upload (re-upload)
```
