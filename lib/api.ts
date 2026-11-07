import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/constants";

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

  // status 0 = internal sentinel meaning no HTTP response was received
  // (timeout, DNS failure, connection refused, etc.).
  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}${path}`, {
      ...options,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch {
    return { data: null, status: 0 };
  }

  if (!res.ok) {
    return { data: null, status: res.status };
  }

  const data: T = await res.json();
  return { data, status: res.status };
}

// Fetches all items from a paginated list endpoint, issuing additional requests
// if total > 100 (the backend's maximum page size). Returns a flat item array.
// On any failure the first failed status is returned with data: null.
export async function apiFetchAll<Item>(
  basePath: string
): Promise<{ data: Item[] | null; status: number }> {
  const first = await apiFetch<{ items: Item[]; total: number }>(
    `${basePath}?limit=100&offset=0`
  );
  if (!first.data) return { data: null, status: first.status };

  const { items, total } = first.data;
  if (total <= 100) return { data: items, status: first.status };

  const pageCount = Math.ceil((total - 100) / 100);
  const rest = await Promise.all(
    Array.from({ length: pageCount }, (_, i) =>
      apiFetch<{ items: Item[]; total: number }>(
        `${basePath}?limit=100&offset=${(i + 1) * 100}`
      )
    )
  );

  for (const page of rest) {
    if (!page.data) return { data: null, status: page.status };
  }

  return {
    data: [...items, ...rest.flatMap((p) => p.data!.items)],
    status: first.status,
  };
}
