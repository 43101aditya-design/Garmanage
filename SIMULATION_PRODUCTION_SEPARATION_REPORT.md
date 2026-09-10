# INTELLIGARAGE — SIMULATION VS PRODUCTION ARCHITECTURAL SEPARATION REPORT

---

## 1. Where Simulation Was Previously Used
Simulation, scenario modeling, and synthetic benchmarks existed in:
- **Digital Twin & Studio (`/api/digital-twin/*`, `DigitalTwinStudio.tsx`)**: Perturbation testing, capacity sensitivity analysis, and multi-objective CP-SAT optimization.
- **Engineering Lab (`/api/engineering/*`, `SimulationPanel.tsx`)**: Experimental queue simulation and visualizer rollbacks.
- **Python FastAPI Service (`python_service/digital_twin/`, `python_service/main.py`)**: In-memory scenario engine and bottleneck diagnostics.

---

## 2. Which Production Workflows Were Affected
- **Mechanic Assignment**: Risk of relying on synthetic scenarios rather than real MySQL queue state.
- **Job Duration Prediction**: Risk of generating simulated jobs instead of real historical vehicle and technician repair duration features.
- **Inventory Reordering**: Risk of simulated stock availability interfering with real purchase requests.
- **Financial & Revenue Forecasting**: Risk of what-if demand projections blending into actual realized revenue KPIs.

---

## 3. All Simulation Dependencies Found
1. **Frontend**: `DigitalTwinStudio.tsx` and `SimulationPanel.tsx` calling `/api/digital-twin/simulate` and `/api/digital-twin/snapshot`.
2. **Backend Gateway**: `backend/controllers/digitalTwinController.js` and `backend/routes/digitalTwinRoutes.js`.
3. **FastAPI Engine**: `python_service/digital_twin/routes.py` and `python_service/digital_twin/scenario_engine.py`.

---

## 4. Changes Made
1. **Environment Guard Middleware (`backend/middleware/environmentGuard.js`)**:
   - Implemented `isSimulationAllowed(req)`: strictly forbids simulation execution on all production transactional routes (`/api/jobs/*`, `/api/appointments/*`, `/api/inventory/*`, `/api/invoices/*`, `/api/decisions/*`, etc.).
   - Implemented `validateAndBoundScenarioParameters()`: enforces realistic upper and lower bounds on what-if parameters (surge factor $\le 500\%$, working hours $1-24$, mechanics $-10$ to $+20$, inventory reduction $\le 100\%$).
   - Implemented `requireSimulationContext`: restricts simulation access to authorized management roles (`owner`, `manager`, `admin`) and blocks unauthorized customer/mechanic invocation.
2. **Production Pipeline Guard (`backend/services/decisionEngine/decisionEngine.js`)**:
   - Enforced that `generatePendingDecisionsForGarage` queries strictly real operational records from `Job_Card`, `Appointment`, `inventory`, `spare_parts`, and `Mechanic_Profile`.
   - Tagged all production decision audit logs with `[PRODUCTION:REAL_DATA]`.
3. **Resilient Production Predictions (`backend/controllers/predictionController.js`)**:
   - Fixed fallback responses when Python ML service is offline to return explicit `mode: 'UNAVAILABLE'` rather than synthesizing fake forecasts.
4. **Digital Twin Mode Isolation (`backend/controllers/digitalTwinController.js` & `svsms`)**:
   - Tagged all simulation runs with `mode: 'SIMULATION'`, `is_simulated: true`, and `[DIGITAL_TWIN:SIMULATION]`.
   - Added prominent visual mode badges on frontend: `DIGITAL TWIN • READ-ONLY SIMULATION MODE • ZERO PROD MUTATION`.

---

## 5. Production Pipeline After Fix
```text
Real MySQL Database
       ↓
Real Current State (Job_Card, Appointment, Inventory, Mechanic_Profile)
       ↓
Real Feature Extraction
       ↓
Production ML Models / Deterministic Heuristics
       ↓
Decision Engine (Decision_Audit)
       ↓
Constraint Validation (Workload, Skills, Status)
       ↓
Human Approval (Owner/Manager in Decision Center)
       ↓
Atomic MySQL Transaction Execution
       ↓
Outcome Tracking & Audit Log
```
- **Zero Simulation Step in this pipeline.**
- **Zero Synthetic Fallbacks.**

---

## 6. Development Simulation Pipeline
```text
Production Snapshot (Read-Only MySQL query)
       ↓
In-Memory Immutable Copy
       ↓
What-If Scenario Injection (Bounded Parameters)
       ↓
OR-Tools CP-SAT Solver / Simulation Engine
       ↓
Projected Analysis Result (Labeled: SIMULATION / WHAT-IF)
       ↓
Simulation_Result Table (Dedicated Sandbox Audit)
```
- **Read-Only / Isolated.**
- **Cannot directly mutate production tables.**

---

## 7. Digital Twin Isolation
- Snapshot generation in `python_service/digital_twin/snapshot.py` performs strictly read-only `SELECT` queries.
- Simulation results are stored exclusively in dedicated audit tables: `Simulation_Scenario`, `Simulation_Run`, and `Simulation_Result`.
- **Zero writes** to `Job_Card`, `Appointment`, `Vehicle`, `Customer`, `Garage`, `inventory`, `Invoice`, or `Payment`.

---

## 8. Engineering Lab Behavior
- Serves as a pure sandbox analysis environment.
- Any "Apply to Production" button from What-If analysis delegates to the production Decision Engine (`POST /api/decisions/:id/approve`), revalidating real database state at execution time.

---

## 9. API Separation
| Endpoint Group | Responsibility | Simulation Allowed? | Database Target |
| :--- | :--- | :--- | :--- |
| `/api/jobs/*` | Real Job Cards & Tracking | **NO (Forbidden)** | `Job_Card` |
| `/api/appointments/*` | Real Service Bookings | **NO (Forbidden)** | `Appointment` |
| `/api/inventory/*` | Real Spare Parts & Stock | **NO (Forbidden)** | `inventory`, `spare_parts` |
| `/api/decisions/*` | Real Decision Engine & Approvals | **NO (Forbidden)** | `Decision_Audit` |
| `/api/predictions/*` | Real Production ML Inference | **NO (Forbidden)** | Real DB / Model |
| `/api/digital-twin/*` | Read-Only What-If Simulation | **YES (Sandbox)** | `Simulation_*` Only |
| `/api/engineering/*` | Diagnostic Benchmarks | **YES (Sandbox)** | In-Memory / Logs |

---

## 10. Python Service Changes
- `/api/predictions/*` and `/api/decisions/*` serve production ML inference.
- `/api/digital-twin/*` and `/api/simulation/*` serve sandbox scenario evaluations.
- All Python simulation endpoints operate purely in-memory on snapshots without write access to MySQL business tables.

---

## 11. Database Safety & Immutability Proof
- Before Simulation: Recorded hash of production tables (`Job_Card`, `Appointment`, `inventory`, `Invoice`).
- Executed Simulation: Ran multiple what-if perturbations (Job surge 2.5x, Mechanic unavailability, 30% inventory reduction).
- After Simulation: Verified identical hash of production tables.
- **Result: ZERO unintended production mutations.**

---

## 12. Security & Tenant Isolation Checks
- Mechanics and Customers are blocked (403 Forbidden) from executing simulations.
- Managers are strictly constrained to their own garage (`forbidden cross-garage access`).
- What-if parameters are bounded against denial-of-service / memory overflow.

---

## 13. Test Results Summary

| Test Case | Description | Result |
| :--- | :--- | :--- |
| **TEST-01** | Production routes block simulation calls (`isSimulationAllowed`) | **PASS** |
| **TEST-02** | What-if scenario parameter bounds enforcement | **PASS** |
| **TEST-03** | Unauthorized role rejection for simulation (Customer & Mechanic $\rightarrow$ 403) | **PASS** |
| **TEST-04** | ML service failure returns explicit `UNAVAILABLE` without fake simulation data | **PASS** |
| **TEST-05** | Digital Twin Simulation preserves production database immutability | **PASS** |
| **TEST-06** | Production workflows continue working when simulation engine is offline | **PASS** |
| **TEST-07** | Stale simulation protection & current-state revalidation on approval | **PASS** |
| **TEST-08** | Multi-garage isolation enforced in Digital Twin | **PASS** |

---

## 14. Remaining Limitations
- Digital Twin snapshots represent point-in-time state; recommendations derived from old snapshots will be re-evaluated against real state upon approval.
