/**
 * @file setup.ts
 * @description Global test environment setup for the client-side test suite.
 *
 * This file runs before every test file in Vitest. It imports and extends
 * the built-in expect matchers with @testing-library/jest-dom's custom
 * DOM matchers (toBeInTheDocument, toHaveValue, toBeVisible, etc.),
 * enabling rich, semantic assertions on rendered React components.
 */
import "@testing-library/jest-dom";
