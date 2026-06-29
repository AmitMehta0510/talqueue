import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// Mock axios before importing resilientHttp
vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import axios from "axios";
import { getNextProxyConfig, resilientGet } from "./resilientHttp";

describe("Resilient HTTP - Proxy Rotation & User Agent Rotation", () => {
  const originalEnv = process.env.PROXY_SERVERS;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.PROXY_SERVERS = originalEnv;
  });

  test("getNextProxyConfig should return null if PROXY_SERVERS is empty", () => {
    delete process.env.PROXY_SERVERS;
    expect(getNextProxyConfig()).toBeNull();
  });

  test("getNextProxyConfig should parse proxy server URL correctly", () => {
    process.env.PROXY_SERVERS = "http://admin:pass123@proxy.domain.com:9000";
    const config = getNextProxyConfig();

    expect(config).not.toBeNull();
    expect(config.host).toBe("proxy.domain.com");
    expect(config.port).toBe(9000);
    expect(config.auth).toEqual({
      username: "admin",
      password: "pass123",
    });
    expect(config.protocol).toBe("http");
  });

  test("resilientGet should attach proxy settings to request if proxies are configured", async () => {
    process.env.PROXY_SERVERS = "http://proxy.local:8080";
    vi.mocked(axios.get).mockResolvedValue({ status: 200, data: "ok" } as any);

    await resilientGet("https://api.external.com/jobs");

    expect(axios.get).toHaveBeenCalledWith(
      "https://api.external.com/jobs",
      expect.objectContaining({
        proxy: {
          host: "proxy.local",
          port: 8080,
          protocol: "http",
          auth: undefined,
        },
      })
    );
  });
});
