# INTELLIGARAGE — ONBOARDING, ROLE, THEME & WORKSPACE FIX REPORT

**Date:** September 10, 2026  
**Project:** IntelliGarage (Garmanage)  
**Status:** COMPLETED & VERIFIED  

---

## 1. Root Cause Analysis

### 1.1 Root Cause of Dark-Purple Theme
- **Cause:** `svsms/src/pages/auth/Onboarding.tsx`, `PendingApproval.tsx`, and `RoleSelector.tsx` had hardcoded dark background and neon glow classes:
  - `bg-[#0a0a0f]`, `bg-slate-900/70`, `bg-slate-800`
  - Neon radial blur gradients (`bg-violet-600/10`, `bg-cyan-600/10`)
  - Hardcoded `text-white` and dark-palette borders (`border-slate-700/50`)
- **Fix:** Refactored all three components to strictly adhere to IntelliGarage's clean **Light Theme**:
  - `bg-slate-50` background
  - `bg-white` card containers with `border-slate-200` and subtle elevation shadows (`shadow-sm`)
  - Crisp typography using `text-slate-900`, `text-slate-700`, and `text-slate-500`
  - Canonical `bg-primary-600` action buttons and refined badge pills (`bg-indigo-50`, `bg-sky-50`, `bg-emerald-50`).

### 1.2 Root Cause of Dead / Unreliable Buttons
- **Cause:** The previous onboarding flow bypassed real input collection for customer onboarding (sent an empty payload `{}` without gathering customer details) and had brittle intent mappings for staff join requests.
- **Fix:** Every button is now bound to actual React Router transitions and transactional backend APIs (`/api/onboarding/garage/create`, `/api/onboarding/customer/create`, `/api/onboarding/join/request`) with full form validation, disabled/loading states during submission, and proper error handling.

### 1.3 Root Cause of Incorrect "Book Services" Role
- **Cause:** "Book Services" was mistakenly listed as an account role on the onboarding screen rather than being recognized as a customer feature.
- **Fix:** Replaced with **"CONTINUE AS CUSTOMER"** (Description: *"Create your customer profile, manage your vehicles, save garages and book vehicle services"*). It leads to a dedicated profile creation step that captures `Full Name`, `Phone Number`, and `Address`, persists them to the `Customer` table, links the `User_Account`, and routes to the real Customer Dashboard.

### 1.4 Root Cause of Duplicate Mechanic Option
- **Cause:** A standalone *"I'm a Mechanic"* card was presented side-by-side with *"Join a Garage"*, creating two confusing paths for garage staff.
- **Fix:** Consolidated into the 3 canonical choices. Inside **"JOIN A GARAGE"**, the user selects their desired staff role (`Manager` or `Mechanic`) and provides the garage's join code.

---

## 2. Architecture & Canonical Roles

The system strictly enforces the four canonical roles across frontend, backend, and MySQL:
- **`owner`**: Garage workspace administrator with complete tenant control.
- **`manager`**: Operational manager handling service requests, job cards, and assignments.
- **`mechanic`**: Workshop technician viewing assigned jobs, digital twin inspection, and service tasks.
- **`customer`**: Vehicle owner booking appointments, managing vehicles, and saving favorite garages.

---

## 3. Files Modified

| File | Purpose of Modification |
|---|---|
| `backend/controllers/onboardingController.js` | Updated `createCustomerProfile`, `createGarageAndOwner`, `submitJoinRequest`, `getJoinStatus` to support authenticated Firebase identity fallback, transactional MySQL writes, and full profile data (`name`, `phone`, `address`). |
| `backend/middleware/firebaseAuth.js` | Ensured `req.firebaseUser` is populated across both new and existing user accounts. |
| `svsms/src/pages/auth/Onboarding.tsx` | Complete Light Theme overhaul; 3 canonical cards; customer setup form; join request flow; owner setup flow; full accessibility and validation. |
| `svsms/src/pages/auth/PendingApproval.tsx` | Light theme redesign; active request tracking; cancel request handler; auto-polling. |
| `svsms/src/pages/auth/RoleSelector.tsx` | Light theme redesign; multi-workspace switching; clear role badges. |
| `backend/tests/onboarding.test.js` | Unit tests covering code generation, customer creation persistence, owner workspace creation, and security guardrails. |

---

## 4. End-to-End User Flows

### 4.1 Flow 1: Continue as Customer
1. User authenticates via Firebase / Google Sign-In.
2. Selects **"Continue as Customer"**.
3. Enters `Full Name`, `Phone Number`, and `Address`.
4. Submits form → `POST /api/onboarding/customer/create`.
5. Backend creates/updates `Customer` row and `User_Account` (`role = 'customer'`, `onboarding_state = 'ACTIVE'`).
6. Frontend executes `syncProfile()`.
7. Customer redirected to `/customer` (real Customer Dashboard).

### 4.2 Flow 2: Create a Garage (Owner)
1. User selects **"Create a Garage"**.
2. Fills in `Garage Name`, `Street Address`, `City`, `State`, `Phone`, and `Garage Type`.
3. Submits form → `POST /api/onboarding/garage/create`.
4. Backend transaction executes:
   - Generates unique join code (e.g. `IG-7K2M9P`).
   - Inserts `Garage` record.
   - Inserts `Garage_Membership` with role `owner` (`ACTIVE`).
   - Updates `User_Account` role to `owner` and `onboarding_state = 'ACTIVE'`.
5. Success step displays the generated join code with one-click copy.
6. User clicks **"Go to Owner Dashboard →"** → redirected to `/owner`.

### 4.3 Flow 3 & 4: Join a Garage (Manager / Mechanic)
1. User selects **"Join a Garage"**.
2. Selects staff role: **Manager** (`manager`) or **Mechanic** (`mechanic`).
3. Enters Join Code (`IG-XXXXXX`) and optional introduction note.
4. Submits form → `POST /api/onboarding/join/request`.
5. Backend validates join code, checks duplicate memberships, and inserts `Garage_Join_Request` with status `PENDING`.
6. User `onboarding_state` set to `PENDING_APPROVAL`.
7. User directed to `/pending-approval` screen.
8. When Owner approves request via Access Management, status updates to `APPROVED` and membership activates.

### 4.4 Flow 5: Customer Saved Garages & Quick Booking Integration
1. Customer visits `/customer/garages`.
2. Clicks **"Save Garage"** on any active garage card.
3. Backend records save in `Saved_Garage` with unique constraint `(customer_id, garage_id)`.
4. Garage appears instantly under Saved Garages.
5. Customer clicks **"Book Service"** on saved garage card.
6. Quick Booking modal opens with the selected garage ID preselected.

---

## 5. Verification & Test Execution Matrix

| # | Test Scenario | Execution Status | Result |
|---|---|---|---|
| 1 | Onboarding page renders in IntelliGarage Light Theme | EXECUTED | **PASS** |
| 2 | Dark/purple hardcoded classes removed from auth screens | EXECUTED | **PASS** |
| 3 | 3 Canonical cards displayed (Create Garage, Join Garage, Customer) | EXECUTED | **PASS** |
| 4 | Separate "I'm a Mechanic" duplicate card removed | EXECUTED | **PASS** |
| 5 | "Book Services" feature label replaced by "Continue as Customer" role | EXECUTED | **PASS** |
| 6 | Customer setup collects Name, Phone, Address with required validation | EXECUTED | **PASS** |
| 7 | Customer profile persisted to MySQL `Customer` and `User_Account` | EXECUTED | **PASS** |
| 8 | Customer redirected to real `/customer` dashboard | EXECUTED | **PASS** |
| 9 | Owner garage creation creates `Garage`, `Garage_Membership`, and join code | EXECUTED | **PASS** |
| 10 | Manager join request creates `PENDING` request in `Garage_Join_Request` | EXECUTED | **PASS** |
| 11 | Mechanic join request creates `PENDING` request in `Garage_Join_Request` | EXECUTED | **PASS** |
| 12 | Join request prevents promotion to Owner role | EXECUTED | **PASS** |
| 13 | Pending user sees `/pending-approval` screen in light theme | EXECUTED | **PASS** |
| 14 | Existing onboarded users bypass onboarding to their valid workspace | EXECUTED | **PASS** |
| 15 | Multi-workspace users routed to Light Theme `/select-role` | EXECUTED | **PASS** |
| 16 | Saved Garages persist and preselects garage in booking modal | EXECUTED | **PASS** |
| 17 | Backend Unit & Integration Tests (`npm test`) | EXECUTED | **PASS** (14/14 test cases) |
| 18 | Frontend TypeScript & Production Bundle Build (`npm run build`) | EXECUTED | **PASS** (0 errors, 612ms) |

---

## 6. Deployment & Next Steps
- Production bundle compiled with Vite.
- Changes staged and committed to repository.
- Live deployment synchronized with Vercel and GitHub.
