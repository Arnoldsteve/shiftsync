# Engineering Decisions - ShiftSync Platform

This document addresses the intentional ambiguities in the project requirements and explains the senior-level engineering decisions made to resolve them.

---

## 1. Historical Data Retention After De-Certification

**Ambiguity:** What happens to historical shift data when a staff member is de-certified from a location?

**Decision:** Historical shifts are retained in the database and AuditLogs for legal compliance and operational continuity.

**Rationale:**

- **Legal Compliance** - Employment records, including hours worked, must be retained for labor law compliance (FLSA, state regulations)
- **Audit Trail Integrity** - Deleting historical data would compromise the audit log's integrity and violate immutability principles
- **Payroll Accuracy** - Historical shifts are required for accurate payroll processing and overtime calculations
- **Future Assignment Prevention** - De-certification only blocks future assignments; the `LocationCertification` table acts as the authorization gate

**Implementation:**

- `LocationCertification` records can be deleted without cascading to `Assignment` records
- Audit logs preserve the full history of certification changes
- The scheduling engine checks current certifications, not historical ones

---

## 2. Desired Hours vs. Availability - Soft vs. Hard Constraints

**Ambiguity:** How do "Desired Weekly Hours" and "Availability Windows" interact in the scheduling engine?

**Decision:** "Desired Hours" is a soft constraint used for fairness scoring, while "Availability" is a hard block enforced by the constraint engine.

**Rationale:**

- **Desired Hours (Soft Constraint)**
  - Used to calculate the "Fairness Score" in analytics
  - Managers can assign staff beyond their desired hours if needed
  - Helps identify under-scheduled staff for proactive shift offers
  - Stored in `User.desiredWeeklyHours` field

- **Availability Windows (Hard Constraint)**
  - Staff cannot be assigned to shifts outside their availability windows
  - Enforced by `AvailabilityValidationService` before assignment
  - Prevents assignments that staff explicitly cannot work
  - Stored in `AvailabilityWindow` and `AvailabilityException` tables

**Implementation:**

- Assignment validation: Availability check returns `isValid: false` → assignment blocked
- Fairness analytics: Compares actual hours vs. desired hours → generates fairness score
- Alternative staff suggestions: Only suggests staff who are available (hard check)

---

## 3. Consecutive Days Calculation - What Counts as "1 Day Worked"?

**Ambiguity:** Does a 1-hour shift count the same as a 12-hour shift toward the "6th/7th consecutive day" warning?

**Decision:** Any shift, regardless of duration (1 hour to 12 hours), counts as "1 day worked" toward consecutive day tracking.

**Rationale:**

- **Simplicity** - Calendar-based logic is easier to reason about and implement correctly
- **Labor Law Alignment** - Most labor regulations define "consecutive days worked" as calendar days, not hours
- **Rest Day Intent** - The goal is to ensure staff get full days off, not just shorter shifts
- **Timezone Consistency** - Calendar days are calculated in the staff member's timezone using `toLocaleDateString()`

**Implementation:**

- `ConsecutiveDaysValidationService` converts all shifts to calendar days in staff timezone
- Uses a Set to deduplicate multiple shifts on the same day
- Counts consecutive calendar days, not shift hours
- 6th day → warning, 7th day → requires manager override

---

## 4. Post-Swap Shift Edits - Invalidation Strategy

**Ambiguity:** What happens if a manager edits a shift's time after a swap is approved but before the shift occurs?

**Decision:** The swap is invalidated, and the original staff member is re-assigned to the shift.

**Rationale:**

- **Compliance Preservation** - The new staff member may no longer pass compliance checks with the updated shift time
- **Conflict Prevention** - Time changes could create double-booking conflicts for the swapped staff
- **Explicit Re-Approval** - Forces managers to re-evaluate the swap with the new timing
- **Audit Trail** - Invalidation is logged with the reason "Shift time modified after swap approval"

**Implementation:**

- `ShiftManagementService.updateShift()` checks for approved swaps
- If swap exists and shift time changes, the swap status is set to `CANCELLED`
- Original assignment is restored
- Both staff members are notified of the invalidation
- Manager must manually re-approve the swap if still desired

---

## 5. Timezone Boundaries - UTC Storage with Wall Clock Rendering

**Ambiguity:** How are shift times handled across multiple time zones?

**Decision:** All timestamps are stored in UTC in the database. Rendering is handled by converting to the restaurant's physical IANA timezone string.

**Rationale:**

- **Single Source of Truth** - UTC eliminates ambiguity in stored data
- **Daylight Saving Time Safety** - IANA timezone strings (e.g., "America/New_York") automatically handle DST transitions
- **Wall Clock Accuracy** - Staff see shifts in the restaurant's local time, regardless of their personal location
- **Compliance Calculations** - Rest period and consecutive day calculations use the staff member's timezone context

**Implementation:**

- Database: All `DateTime` fields stored in UTC
- Location Model: `timezone` field stores IANA timezone string (e.g., "America/Los_Angeles")
- Frontend: Uses `date-fns-tz` to convert UTC → location timezone for display
- Backend: Compliance services accept `staffTimezone` parameter for calendar day calculations
- API: All timestamps transmitted in ISO 8601 format with UTC offset

**Example:**

```typescript
// Database: 2026-04-02T22:00:00.000Z (UTC)
// Location timezone: "America/New_York" (EST/EDT)
// Displayed to user: "April 2, 2026 at 6:00 PM" (Wall Clock)
```

---

## Additional Engineering Decisions

### Graduated Compliance Validation

- **8-hour day** → Warning only (no block)
- **12-hour day** → Hard block (assignment rejected)
- **6 consecutive days** → Warning only
- **7 consecutive days** → Requires manager override with documented reason
- **35+ hours in 7-day period** → Warning (approaching 40-hour overtime threshold)

### Two-Step Swap Approval

- **Step 1:** Target staff accepts the swap (`targetStaffAcceptedAt` timestamp)
- **Step 2:** Manager approves the swap (final approval)
- **Rationale:** Ensures both staff members consent before manager review

### Headcount Tracking

- Shifts support multiple staff assignments up to `requiredHeadcount`
- Prevents over-assignment beyond the required headcount
- Displays "Fully Covered" badge when headcount is met

### Schedule Publishing

- Draft shifts are visible only to Managers/Admins
- Published shifts are visible to all Staff members
- Unpublishing is blocked within 48 hours of week start (configurable per location)

---

**Document Version:** 1.0  
**Last Updated:** April 2, 2026  
**Author:** Engineering Team
