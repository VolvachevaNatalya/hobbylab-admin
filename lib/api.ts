import { cookies } from "next/headers";

const COOKIE_NAME = "hobbylab_token";

function getApiUrl(): string {
  const url = process.env.API_URL;
  if (!url) throw new Error("API_URL environment variable is not set");
  return url;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T | null; status: number }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  const res = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    return { data: null, status: res.status };
  }

  const data: T = await res.json();
  return { data, status: res.status };
}
