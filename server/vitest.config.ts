import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    env: {
      JWT_SECRET: "test_jwt_secret_key_12345",
      PORT: "5000",
      DATABASE_URL: "postgresql://postgres:password@localhost:5432/test",
    },
    alias: {
      shared: path.resolve(__dirname, "./src/shared"),
      modules: path.resolve(__dirname, "./src/modules"),
      services: path.resolve(__dirname, "./src/services"),
      controllers: path.resolve(__dirname, "./src/controllers"),
    },
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
