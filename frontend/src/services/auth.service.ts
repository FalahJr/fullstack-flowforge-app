import { api } from "./api";

type AuthPayload = {
  email: string;
  password: string;
  tenantName?: string;
};

export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  user: {
    id: string;
    email: string;
    tenantId: string;
    role: string;
  };
};

export async function login(payload: AuthPayload) {
  const response = await api.post<AuthResponse>("/auth/login", payload);
  return response.data;
}

export async function register(payload: AuthPayload) {
  const response = await api.post<AuthResponse>("/auth/register", payload);
  return response.data;
}
