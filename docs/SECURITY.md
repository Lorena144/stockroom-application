# Security controls for increment 1

This is a local-only application with fictional records. Controls are informed by OWASP ASVS 5.0.0 and OWASP cheat sheets; this is not a complete ASVS assessment.

| Area               | Implemented control                                                                                           | Limit or follow-up                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Passwords          | Salted scrypt; no password or hash in API output                                                              | Demo account provisioning only; no recovery or registration yet                              |
| Sessions           | Opaque random token; hash stored; 30-minute idle and 8-hour absolute expiry; logout revocation                | Cookie persists across browser restarts until server expiry; closing a browser is not logout |
| CSRF               | HMAC-signed double-submit token, constant-time comparison, exact Origin validation on POST, PATCH, and DELETE | API clients must keep cookies and send both token and Origin                                 |
| Authorization      | Every protected API request authenticates; inventory requires staff                                           | Customer inventory page shows an access-denied message; the inventory API returns HTTP 403   |
| Validation         | Strict schemas, length limits, bounded query values, 16 KiB JSON bodies                                       | Future write endpoints require their own business validation                                 |
| Injection          | Parameterized SQL, allowlisted ordering, React escaping                                                       | No rich HTML input is accepted                                                               |
| Login abuse        | Persistent email counter and installation counter, Retry-After                                                | Installation limit fits loopback use; distributed hosting needs a reviewed shared limiter    |
| Browser protection | Nonce CSP, no framing, MIME sniffing prevention, restricted permissions                                       | Inline styles allowed for framework/Swagger rendering; eval allowed only in development      |
| Secrets            | Random local CSRF secret and generated demo passwords; ignored files                                          | Local file access is governed by the user's Windows account; no production secret manager    |
| Transport          | Loopback binding; HttpOnly and Strict cookies                                                                 | HTTP only for local use; HTTPS deployment is a separate task                                 |
| Dependencies       | Pinned direct dependencies and lockfile; npm audit at delivery                                                | Audit is a point-in-time advisory check, not proof of absence of vulnerabilities             |
| Data reset         | Explicit local CLI only; production guard                                                                     | Reset invalidates all sessions and replaces demo passwords                                   |

Sources: https://asvs.owasp.org/ ; https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html ; https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html ; https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html

## Increment 2 controls (12 November 2026)

- Cart and order APIs require a customer session. Ownership comes from that session, not a body/query owner ID. Staff are rejected; another customer's order and an unknown ID return the same 404.
- Every POST, PATCH, and DELETE mutation checks the signed CSRF cookie/header and exact Origin. Swagger refreshes CSRF for all these methods. Existing session expiry, logout revocation, CSP, body limits, and safe error handling remain.
- Strict schemas reject client prices, totals, ownership, status, and unsupported fields. Quantities are integers 1–99, with a 50-line cart limit and current stock validation.
- Prices and totals come from database values in integer cents. A server-signed account-bound quote binds the reviewed cart version, products, quantities, and prices. Availability is checked again at placement.
- A BEGIN IMMEDIATE transaction saves the order and immutable lines, deducts stock, clears the cart, and records replay protection together. Any failure rolls back all changes.
- Persistent account/key records bind successful idempotency keys to request fingerprints. A unique account/cart revision prevents duplicate placement across tabs with different keys. Replays cannot deduct stock twice. Keys are not authorization credentials.
- No payment, cancellation, refund, fulfillment, or administrative order endpoint is introduced. The deliberate demo product-edit CLI is parameterized, validates input, and refuses production mode.
- Demo reset deletes commerce child records before parent accounts/products. Existing installations apply migrations without resetting data.

This extends the local control inventory; it is not a complete ASVS assessment or a claim of production payment readiness.
