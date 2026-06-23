/// <reference types="node" />
// This file lives at server/ root, outside tsconfig "include": ["src"],
// so @types/node globals (process, __dirname) need the triple-slash reference above.
//
// Env-loading strategy:
//  1. Any DATABASE_URL already set in the shell / Docker environment wins.
//  2. Otherwise dotenv loads server/.env using __dirname so the path is always
//     resolved relative to this file — not Prisma's internal CWD.
//  3. Prisma 6 prints "skipping environment variable loading" when a config file
//     is detected; that is expected — our dotenv call below replaces it.
import path from "path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Only call dotenv when DATABASE_URL hasn't been injected by the shell already.
if (!process.env["DATABASE_URL"]) {
  dotenv.config({ path: path.join(__dirname, ".env.local") }); // personal overrides (git-ignored)
  dotenv.config({ path: path.join(__dirname, ".env") });        // server/.env  ← main dev config
}

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error(
    "[prisma.config.ts] DATABASE_URL is not set.\n" +
    "Run: docker compose -f docker-compose.local-infra.yml up -d\n" +
    "Then ensure server/.env contains a valid DATABASE_URL."
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl, // type is now string (not string | undefined) — TS error resolved
  },
});
