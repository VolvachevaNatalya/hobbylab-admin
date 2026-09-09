"use server";

import { cookies } from "next/headers";
import type { OrgDetailItem } from "@/types/auth";

const COOKIE_NAME = "hobbylab_token";

// Matches AdminOrganizationCreate / AdminOrganizationUpdate schemas.
// All fields except name are optional: undefined values are omitted from
// JSON.stringify, so PATCH only touches the fields the caller explicitly sets.
export type OrgFormData = {
  name: string;
  description?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  telegram_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
  whatsapp_url?: string | null;
  address?: string | null;
  city?: string | null;
  city_id?: number | null;
  trial_lesson_available?: boolean;
  trial_lesson_price?: number | null;
  trial_lesson_comment?: string | null;
  status?: string | null;
  verified?: boolean;
  category_ids?: number[];
};

export type OrgActionResult = {
  ok: boolean;
  message?: string;
  sessionExpired?: boolean;
};

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

function buildAuthHeaders(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getApiBase(): string {
  const url = process.env.API_URL;
  if (!url) throw new Error("API_URL is not set");
  return url;
}

function extractError(body: unknown): string {
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

export async function createOrganization(
  data: OrgFormData
): Promise<OrgActionResult> {
  let base: string;
  try {
    base = getApiBase();
  } catch {
    return { ok: false, message: "Server misconfiguration." };
  }

  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${base}/admin/organizations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(token),
      },
      body: JSON.stringify(data),
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      message: "Backend is temporarily unavailable. Please try again.",
    };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, sessionExpired: true };
  if (res.status === 422) {
    const body = await res.json().catch(() => null);
    return { ok: false, message: extractError(body) };
  }
  if (!res.ok) return { ok: false, message: "Failed to create organization. Please try again." };

  return { ok: true };
}

export async function updateOrganization(
  id: number,
  data: OrgFormData
): Promise<OrgActionResult> {
  let base: string;
  try {
    base = getApiBase();
  } catch {
    return { ok: false, message: "Server misconfiguration." };
  }

  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${base}/admin/organizations/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(token),
      },
      body: JSON.stringify(data),
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      message: "Backend is temporarily unavailable. Please try again.",
    };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, sessionExpired: true };
  if (res.status === 404) return { ok: false, message: "Organization not found. It may have been deleted." };
  if (res.status === 422) {
    const body = await res.json().catch(() => null);
    return { ok: false, message: extractError(body) };
  }
  if (!res.ok) return { ok: false, message: "Failed to update organization. Please try again." };

  return { ok: true };
}

export async function deleteOrganization(id: number): Promise<OrgActionResult> {
  let base: string;
  try {
    base = getApiBase();
  } catch {
    return { ok: false, message: "Server misconfiguration." };
  }

  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${base}/admin/organizations/${id}`, {
      method: "DELETE",
      headers: buildAuthHeaders(token),
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      message: "Backend is temporarily unavailable. Please try again.",
    };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, sessionExpired: true };
  if (res.status === 404) return { ok: false, message: "Organization not found. It may have already been deleted." };
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, message: extractError(body) };
  }

  return { ok: true };
}

export async function getOrganizationDetail(
  id: number
): Promise<{ data: OrgDetailItem | null; status: number }> {
  let base: string;
  try {
    base = getApiBase();
  } catch {
    return { data: null, status: 0 };
  }

  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${base}/admin/organizations/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(token),
      },
      cache: "no-store",
    });
  } catch {
    return { data: null, status: 0 };
  }

  if (!res.ok) {
    return { data: null, status: res.status };
  }

  const data = await res.json();
  return { data: data as OrgDetailItem, status: res.status };
}
