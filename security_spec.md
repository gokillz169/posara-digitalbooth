# Security Specification — POSARA Admin & Booth Access Control

## 1. Data Invariants
1. **Default-Deny Catch-All**: Every path not explicitly matched under `/databases/{database}/documents` is denied (`allow read, write: if false`).
2. **Verified Owner Bootstrap**: Only verified Google accounts (`request.auth.token.email_verified == true`) whose email matches `mutawakkils16@gmail.com` or whose UID exists in `/admins/{uid}` with `role in ['owner', 'admin']` are recognized as admins.
3. **No Self-Escalation / PII & PIN Isolation**:
   - `/admins/{adminId}` contains email PII; reads are strictly scoped to the verified owner/admin matching `adminId`.
   - `/booth_settings/{settingId}` contains `kioskPin` and `ownerEmail`; unauthenticated or non-admin regular users cannot `get`, `list`, `create`, `update`, or `delete` `/admins/{adminId}` or `/booth_settings/{settingId}`.
   - `/public_booth_config/main` contains ONLY zero-PII kiosk display/payment config (`autoResetEnabled`, `customWatermarkEnabled`, `watermarkText`, `qrisMerchantString`, `updatedAt`); readable via single-document `get` (`list` disabled) and writable only by verified admin.
4. **Strict Schema & Server Timestamps**:
   - Every write enforces `hasAll` and `hasOnly` key allowlists, string `.size()` limits, regex validation for IDs, `kioskPin` (`^[0-9]{4,6}$`), `cycleKey` (`^[0-9]{4}-[0-9]{2}$`), `qrisMerchantString` (`^000201.*` or empty), and `referenceCode` (`^[A-Z0-9\\-]+$`), plus `request.time` server timestamp equality.
   - `uid`, `ownerUid`, and `createdAt` are immutable after creation.
5. **Upgrade Request & Server-Side Price Integrity**:
   - Regular verified users may only create `/upgrade_requests/{requestId}` with `status: 'pending'`, `reviewedByEmail: ''`, `uid == request.auth.uid`, `email == request.auth.token.email`, a valid `invoiceNumber` (`^[A-Z0-9\-]+$`, 6–32 chars), AND exact price matrix matching `(requestedPlan, billingCycle, amountIdr)` (`5000`, `15000`, `144000`).
   - Regular users cannot update or delete `/upgrade_requests/{requestId}`, nor read/list other users' requests.
   - Only verified Owner/Admin can transition `upgrade_requests` from `'pending'` to `'approved'` or `'rejected'` while keeping order payload (`requestedPlan`, `billingCycle`, `amountIdr`, `referenceCode`, `invoiceNumber`) immutable.
   - On `/user_plans/{userId}`, the complimentary lifetime allowlist (`mutawakkils16@gmail.com`, `fitriyaninovitasari8@gmail.com`, verified email only) receives free lifetime `'studio'` (`999999` credits); `fitriyaninovitasari8@gmail.com` does NOT receive Admin/Owner privileges. All other users start strictly on `'free'` (`20` credits), require monthly/pass QRIS payment verified by Owner, and are limited to credit deduction and forward-only cycle resets (`incoming().cycleKey > existing().cycleKey`).

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated read or write on `/booth_settings/main`.
2. Unauthenticated write on `/public_booth_config/main` or `list` scraping on `/public_booth_config`.
3. Non-admin verified user (`guest@gmail.com`) creating `/admins/{guestUid}` with `role: "owner"`.
4. Non-admin verified user (`guest@gmail.com`) reading `/admins/{ownerUid}` (PII leak attempt).
5. Non-admin verified user reading or listing `/booth_settings`.
6. Unverified email spoof (`email: "mutawakkils16@gmail.com"`, `email_verified: false`) reading or writing `/booth_settings/main` or `/public_booth_config/main`.
7. Owner creating `/booth_settings/main` with extra shadow field (`isSuperAdmin: true`) — rejected by `hasOnly()`.
8. Owner updating `/booth_settings/main` trying to change immutable `ownerUid` or `createdAt`.
9. Owner writing `/booth_settings/main` with oversized `watermarkText` (> 80 chars) or invalid `kioskPin` (`"abc"` or `"12"`).
10. Customer creating `/upgrade_requests/{id}` with tampered discounted `amountIdr` (`1000` for `studio` `yearly`) — rejected by `isValidPlanOrderPrice()`.
11. Customer creating `/upgrade_requests/{id}` pre-set to `status: "approved"` or for another user's `uid` — rejected by create invariants.
12. Customer updating `/user_plans/{uid}` with `cycleKey` rolled back (`"2026-10"` when existing is `"2026-11"`) or escalating `plan: "studio"` — rejected by `incoming().cycleKey > existing().cycleKey` and `incoming().plan == existing().plan`.
