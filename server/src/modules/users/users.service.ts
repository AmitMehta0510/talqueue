/**
 * @file users.service.ts — Re-export barrel
 *
 * The 2,000+ line monolith has been decomposed into:
 *   _shared.ts           — Shared types, constants, Prisma selects, private helpers
 *   profile.service.ts   — profile CRUD, getMyProjects, department resolution
 *   skills.service.ts    — skill CRUD + search + verification
 *   experience.service.ts — experience CRUD + verifyWorkEmail
 *   education.service.ts — education CRUD + verifyCollegeEmail
 *
 * All original public exports are preserved here so every existing import
 * (users.controller.ts, tests, other modules) works unchanged.
 */

// Sub-services (each re-exports only their own types from _shared)
export * from "./profile.service";
export * from "./skills.service";
export * from "./experience.service";
export * from "./education.service";
