import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { registry } from "./registry";

// Must call this before using .openapi() on any schema
extendZodWithOpenApi(z);

// ─── Security Scheme ──────────────────────────────────────────────────────────
registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

// ─── Common response schemas ──────────────────────────────────────────────────
const ErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z
    .array(z.object({ path: z.string(), message: z.string() }))
    .optional(),
}).openapi("ErrorResponse");

registry.register("ErrorResponse", ErrorResponseSchema);

// ─── Auth schemas ─────────────────────────────────────────────────────────────
const RegisterBodySchema = z
  .object({
    email: z.string().email(),
    username: z.string().min(3).max(30),
    password: z.string().min(8),
    fullName: z.string().min(2).max(100),
    role: z.string(),
  })
  .openapi("RegisterBody");

const LoginBodySchema = z
  .object({
    email: z.string().email(),
    password: z.string(),
  })
  .openapi("LoginBody");

const AuthResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      token: z.string().describe("Short-lived JWT access token (15 min)"),
      user: z.object({
        id: z.string(),
        email: z.string().email(),
        username: z.string(),
        primaryRole: z.string(),
      }),
    }),
  })
  .openapi("AuthResponse");

registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Register a new user",
  security: [],
  request: { body: { content: { "application/json": { schema: RegisterBodySchema } } } },
  responses: {
    201: { description: "User registered", content: { "application/json": { schema: AuthResponseSchema } } },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Login with email and password",
  security: [],
  request: { body: { content: { "application/json": { schema: LoginBodySchema } } } },
  responses: {
    200: { description: "Login successful", content: { "application/json": { schema: AuthResponseSchema } } },
    401: { description: "Invalid credentials", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  tags: ["Auth"],
  summary: "Refresh access token using HttpOnly RT cookie",
  description:
    "No Authorization header required. The refresh token is read from the `ep_refresh_token` " +
    "HttpOnly cookie set during login. Returns a new short-lived access token and rotates the RT.",
  security: [],
  responses: {
    200: { description: "Token refreshed", content: { "application/json": { schema: AuthResponseSchema } } },
    401: { description: "Invalid or expired refresh token", content: { "application/json": { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Logout — revokes access token + refresh token",
  responses: {
    200: { description: "Logout successful" },
    401: { description: "Unauthorized" },
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  tags: ["Auth"],
  summary: "Get current authenticated user",
  responses: {
    200: { description: "Current user" },
    401: { description: "Unauthorized" },
  },
});

// ─── Users schemas ─────────────────────────────────────────────────────────────
const UpdateProfileBodySchema = z
  .object({
    bio: z.string().max(500).optional(),
    headline: z.string().max(120).optional(),
    location: z.string().max(100).optional(),
    openToWork: z.boolean().optional(),
    openToInternship: z.boolean().optional(),
    githubUrl: z.string().url().optional(),
    linkedinUrl: z.string().url().optional(),
    portfolioUrl: z.string().url().optional(),
  })
  .openapi("UpdateProfileBody");

registry.registerPath({
  method: "get",
  path: "/users/me",
  tags: ["Users"],
  summary: "Get my profile",
  responses: { 200: { description: "Profile data" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "put",
  path: "/users/me",
  tags: ["Users"],
  summary: "Update my profile",
  request: { body: { content: { "application/json": { schema: UpdateProfileBodySchema } } } },
  responses: {
    200: { description: "Profile updated" },
    400: { description: "Validation error", content: { "application/json": { schema: ErrorResponseSchema } } },
    401: { description: "Unauthorized" },
  },
});

registry.registerPath({
  method: "get",
  path: "/users/me/full",
  tags: ["Users"],
  summary: "Get my full profile (skills, experience, education, projects)",
  responses: { 200: { description: "Full profile" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "get",
  path: "/users/skills/search",
  tags: ["Users"],
  summary: "Search skills by name prefix",
  request: { query: z.object({ q: z.string(), limit: z.string().optional() }) },
  responses: { 200: { description: "Matching skills" }, 401: { description: "Unauthorized" } },
});

registry.registerPath({
  method: "post",
  path: "/users/me/skills",
  tags: ["Users"],
  summary: "Add a skill to my profile",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z
            .object({ skillId: z.string().cuid(), level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]) })
            .openapi("AddSkillBody"),
        },
      },
    },
  },
  responses: { 201: { description: "Skill added" }, 400: { description: "Validation error" } },
});

registry.registerPath({
  method: "post",
  path: "/users/me/experiences",
  tags: ["Users"],
  summary: "Add a work experience",
  responses: { 201: { description: "Experience added" }, 400: { description: "Validation error" } },
});

registry.registerPath({
  method: "post",
  path: "/users/me/educations",
  tags: ["Users"],
  summary: "Add an education record",
  responses: { 201: { description: "Education added" }, 400: { description: "Validation error" } },
});

registry.registerPath({
  method: "get",
  path: "/users/{userId}",
  tags: ["Users"],
  summary: "Get a user full profile by ID",
  request: { params: z.object({ userId: z.string() }) },
  responses: { 200: { description: "User profile" }, 404: { description: "Not found" } },
});
