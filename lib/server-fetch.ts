import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/constants";

export async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export function buildAuthHeaders(
  token: string | undefined
): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getApiBase(): string {
  const url = process.env.API_URL;
  if (!url) throw new Error("API_URL is not set");
  return url;
}

export function extractError(body: unknown): string {
  if (typeof body !== "object" || body === null) {
    return "An unexpected error occurred. Please try again.";
  }
  const b = body as Record<string, unknown>;
  if (typeof b.detail === "string") return b.detail;
  if (Array.isArray(b.detail)) {
    return b.detail
      .map((d) => {
        if (typeof d === "object" && d !== null && "msg" in d) {
          return String((d as { msg: unknown }).msg);
        }
        return String(d);
      })
      .join(". ");
  }
  return "An unexpected error occurred. Please try again.";
}
