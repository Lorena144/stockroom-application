# Increment 2 delivery verification

Date: 12 November 2026. Version: 0.2.0. Application: the Stockroom application repository.

Status: developer verification completed; ready for the learner's independent increment 2 testing. Increment 3 is not implemented. The learner reports 144 passing UI, API, and hybrid executions and a published framework for increment 1; those are separate from the checks below.

## CI account provisioning — 13 November 2026

- With `CI=true`, fresh setup uses `CUSTOMER_PASSWORD` and `STAFF_PASSWORD` from the
  environment for the first customer and staff accounts. Local setup and the second
  customer continue to use generated passwords.
- Ten isolated setup scenarios containing 45 checks passed using temporary databases:
  local generation, CI password hashing, repeated setup with existing accounts and cart
  data, missing passwords, invalid passwords, and the production guard.
- Missing or invalid CI passwords are rejected before local configuration or database
  creation. Setup output did not contain the supplied CI passwords.
- The verification used disposable credentials and databases, then removed the
  temporary files. The working installation's accounts and data were not used.

## Build and upgrade

- TypeScript checking and the optimized production build passed after the final UI readiness change.
- Source and database snapshots were saved under the ignored .local/release-backups directory before upgrade.
- Schema migration 2 applied without a reset. Read-only comparison against the database snapshot confirmed that users, password hashes, products, stock, sessions, and login limits were preserved.
- The primary database has no developer verification orders or cart lines. HTTP/browser scenarios used .local/increment2-verification.sqlite, a separate copy.
- Fresh setup, repeated setup, reset with commerce child records, password rotation, and production setup guards passed in .local/increment2-setup-probe. The primary database was never reset.
- The local product CLI accepted valid stock/price changes and rejected invalid numbers, unknown SKUs, and production use against the setup probe.

## Developer HTTP checks

Temporary checks passed for:

- Customer cart isolation; anonymous/staff rejection; foreign-order nondisclosure; strict schemas; invalid quantity types and boundaries; SQL-like input; unknown and out-of-stock products; malformed/oversized bodies; content types; unsupported methods.
- Missing/invalid CSRF and wrong Origin on cart mutations; no-store and request-ID response headers.
- Add, absolute quantity update, removal, repeated removal, integer-cent totals, no reservation, the 99-unit limit, and the 50-distinct-product limit.
- Empty carts, stale cart versions, changed reviewed prices, stock shortages, and absence of partial orders, deductions, or cart clearing on rejection.
- Atomic successful placement, exact stock deductions, cart clearing, saved details, and immutable prices.
- Same-key replay, different-payload key conflicts, alias-key conflicts, concurrent same-key/different-key placement, and two customers competing for the final unit.
- Durable replay after server restart returned the original order without another deduction.
- OpenAPI 0.2.0 paths and concrete success/conflict examples.

The initial HTTP run completed 556 assertions, including response/header checks. This is not a count of independent learner tests or a claim of complete security coverage.

## Browser checks

The final journey passed in Chromium, Firefox, and WebKit:

- Add from catalog and product details with a selected quantity; view/update totals; remove items; see the empty cart.
- Double-click placement creates one order; inspect confirmation and saved details; reload without creating another order.
- Open My orders, follow its order number, and compare the displayed total with the API.
- Simulate a committed order with a lost response, reload the same cart tab, and recover the original confirmation without another order or stock deduction.
- Reject changed prices and insufficient stock in the UI, refresh the review, and keep the cart available for correction.
- Execute Swagger PATCH and DELETE with automatic CSRF refresh.
- Recheck explicit Search submission and keyboard-accessible Clear search.
- No unhandled browser JavaScript errors were observed.

An initial stale client asset issue was cleared by rebuilding with the prior server stopped. A WebKit check exposed an early product-input timing issue; purchase inputs/buttons now remain disabled until the client can handle them. Final checks passed after this correction.

Desktop cart, 390-pixel mobile cart, and order confirmation screenshots were visually reviewed. The mobile cart fits without page-level horizontal overflow. Controls use native buttons/forms/labels, visible focus styles, and scoped hooks including cart-item, cart-total, place-order, and order-confirmation.

No automation files or generated regression-test files were added or changed. Temporary developer checks do not replace the learner's independent test design.

## Boundaries

Only status placed is implemented. Payments, cancellation, refunds, shipping, and staff order processing are unavailable. The local SQLite interface remains experimental in Node 24, and the application remains loopback-only. Dependency versions were not changed; the historical advisory result below is not a new audit or certification.

---

## Earlier increment 1 delivery verification (historical)

Date: 5 November 2026. Target: the local application in `the Stockroom application repository`.

- TypeScript checking passed.
- Optimized production build passed in the requested application folder.
- Seventy temporary developer HTTP checks passed. Coverage included valid and invalid login, malformed and oversized input, CSRF and Origin rejection, authentication, role restrictions, session expiry, logout revocation, literal search, category and stock combinations, stable sorting, pagination, product details, category counts, and login rate limiting.
- Browser checks passed for customer sign-in, combined category and stock filters, product details, customer access denial, logout, staff sign-in and inventory, mobile catalog at 390 pixels, empty search results, reset filters, and pagination.
- Swagger definition loaded successfully. A POST logout executed through Swagger and returned 204 with automatic CSRF handling. Two documentation UI issues found during verification were corrected.
- Dependency audit after the validation-library update returned zero known advisories. This is a point-in-time result.
- The seeded catalog contains 24 products, 323 units, six low-stock products, and three out-of-stock products.
- At this earlier delivery the automation folder was empty. The learner has since completed and published that framework.

These are developer verification results, not a completed portfolio test suite or a security certification. This earlier browser verification used the in-app browser. Current increment 2 checks in Chromium, Firefox, and WebKit are recorded above.

The local database API is experimental in Node 24.13. The local service is loopback-only HTTP and is not configured for public hosting. These limits are documented in the README, release guide, and security notes.
