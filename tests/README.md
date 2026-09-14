# Testing Guide

This document describes the test implementation rules and execution steps for `video-review`.

## Scope
- Target: tests executed with `vitest`
- Current primary target: API tests under `tests/server/**`

## Directory Rules
- Place test files under `tests/`
- Follow the same structure as source code  
  Example: `src/server/routes/videos/list.ts` -> `tests/server/routes/videos/list.test.ts`
- Put shared mocks under `tests/mocks/`

## Naming Rules
- File names must end with `*.test.ts`
- Use clear feature names in `describe`
- Use behavior-focused sentences in `it`

## Run Tests
- All tests: `npm test`
- Server tests: `npm run test:hono`
- Single file: `npm run test:hono -- tests/server/routes/videos/list.test.ts`
- E2E tests: `npm run test:e2e`

## DB-Dependent Tests
- Run DB-dependent tests through `run-test.ts`
- The following steps are executed every time before tests:  
  `prisma migrate reset` -> `prisma generate --generator client` -> `prisma seed`
- Create only minimal fixture data inside each test
- Always clean up created data in `afterAll`
- Respect foreign key order during cleanup

## End-to-End Tests
- Run: `npm run test:e2e` (install the browser once with `npm run test:e2e:install`)
- Specs live in `tests/e2e/`, orchestrated by `run-e2e.ts`
- Playwright runs twice: `@bootstrap` specs against an unseeded database, the rest against the seeded one
- Each pass gets its own server: the secret cache in `src/server/lib/token.ts` is process-wide
- Tag a spec `@bootstrap` in its `describe` title if it needs an empty database

## Test Writing Policy
- Keep one responsibility per test
- Assert concrete expected behavior
- If using random values, keep the purpose explicit (for example, collision avoidance)
- Avoid early abstraction; extract helpers only after repeated patterns appear

## Minimal Checklist
- Include at least one failure case
- Include at least one success case
- Leave no unnecessary side effects
- Ensure commands are the same for local and CI runs

