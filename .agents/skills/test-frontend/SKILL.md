---
name: test-frontend
description: "Write or repair Super App frontend Vitest, Effector, RTL and MSW tests; use e2e skills for browser journeys."
---

# Frontend tests

Read `docs/conventions/frontend-testing.md`, relevant production code and existing
nearby tests. Use `fork`/`allSettled` for Effector state and effect handlers; use RTL
roles/labels and `userEvent` for user behavior. Answer all network requests through
MSW or fork handlers; real network is a test failure.

Respect the shared/isolated Vitest projects: shared tests reset module state, timers,
spies, globals and local storage; files requiring module mocks use the existing
isolation mechanism. Reset queued mock implementations rather than only clearing calls.
Test regressions and observable outcomes; avoid styled pixel assertions or testing
a duplicate implementation. Keep test seams out of production public barrels.

Run `npm --prefix frontend test -- <path>` and the relevant lint/type checks. Fix
failures without `.skip`, `.only`, weakening assertions or adding production-only
workarounds for test convenience. Report the tests actually run.
