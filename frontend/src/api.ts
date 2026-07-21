/**
 * Simple API client with JWT bearer auth. Reads token from secure storage.
 */
import { storage } from "@/src/utils/storage";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";
const TOKEN_KEY = "lobiimo_auth_token";

export type ApiError = { detail?: string; message?: string };

async function request<T = any>(
  path: string,
  method: string = "GET",
  body?: any,
): Promise<T> {
  const token = await storage.secureGet<string>(TOKEN_KEY, "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      (payload && (payload.detail || payload.message)) ||
      `Erreur ${res.status}`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return payload as T;
}

export const api = {
  get: <T = any>(path: string) => request<T>(path, "GET"),
  post: <T = any>(path: string, body?: any) => request<T>(path, "POST", body),
  put: <T = any>(path: string, body?: any) => request<T>(path, "PUT", body),
  patch: <T = any>(path: string, body?: any) => request<T>(path, "PATCH", body),
  delete: <T = any>(path: string) => request<T>(path, "DELETE"),
};

export const TOKEN_STORAGE_KEY = TOKEN_KEY;
