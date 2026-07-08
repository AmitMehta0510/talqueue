import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry";

// Registrations are side-effecting imports -- they must run before we generate.
import "./schemas";

/**
 * Generates the full OpenAPI 3.1 document from all registered schemas and paths.
 * Called lazily (first /docs request) so startup time is unaffected.
 */
export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Engineers Platform API",
      version: "1.0.0",
      description:
        "REST API for the Engineers Platform — a full-stack collaborative engineering community. " +
        "All protected endpoints require a Bearer JWT in the Authorization header.",
      contact: {
        name: "Engineers Platform",
      },
    },
    servers: [
      { url: "/api/v1", description: "Current environment" },
    ],
    security: [{ bearerAuth: [] }],
  });
}
