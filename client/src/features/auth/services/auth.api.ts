import { request } from "../../../core/api/client";
import type { EndpointOptions } from "../../../core/api/client";
import type { AuthPayload, User, RoleName } from "../../../core/types/models";

export const authApi = {
  login: (body: { email: string; password: string }) =>
    request<AuthPayload>("/auth/login", { method: "POST", body }),
  register: (body: {
    email: string;
    username: string;
    password: string;
    fullName: string;
    role: RoleName;
  }) => request<AuthPayload>("/auth/register", { method: "POST", body }),
  me: (options?: EndpointOptions) => request<User>("/auth/me", options),
  logout: () =>
    request<{ loggedOut: boolean }>("/auth/logout", { method: "POST" }),
};
