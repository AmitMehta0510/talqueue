import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

/**
 * Central OpenAPI registry instance.
 * Import this anywhere you want to register schemas or paths.
 */
export const registry = new OpenAPIRegistry();
