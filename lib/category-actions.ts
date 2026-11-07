"use server";

import {
  getToken,
  buildAuthHeaders,
  getApiBase,
  extractError,
} from "@/lib/server-fetch";

export type CategoryFormData = {
  name: string;
  name_en: string | null;
  name_ru: string | null;
  name_he: string | null;
  icon_url: string | null;
};

export type CategoryActionResult = {
  ok: boolean;
  message?: string;
  sessionExpired?: boolean;
};

export async function createCategory(
  data: CategoryFormData
): Promise<CategoryActionResult> {
  let base: string;
  try {
    base = getApiBase();
  } catch {
    return { ok: false, message: "Server misconfiguration." };
  }

  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${base}/admin/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(token),
      },
      body: JSON.stringify(data),
      cache: "no-store",
    });
  } catch {
    return { ok: false, message: "Backend is temporarily unavailable. Please try again." };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, sessionExpired: true };
  if (res.status === 422) {
    const body = await res.json().catch(() => null);
    return { ok: false, message: extractError(body) };
  }
  if (!res.ok) return { ok: false, message: "Failed to create category. Please try again." };

  return { ok: true };
}

export async function updateCategory(
  id: number,
  data: CategoryFormData
): Promise<CategoryActionResult> {
  let base: string;
  try {
    base = getApiBase();
  } catch {
    return { ok: false, message: "Server misconfiguration." };
  }

  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${base}/admin/categories/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(token),
      },
      body: JSON.stringify(data),
      cache: "no-store",
    });
  } catch {
    return { ok: false, message: "Backend is temporarily unavailable. Please try again." };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, sessionExpired: true };
  if (res.status === 404) return { ok: false, message: "Category not found. It may have been deleted." };
  if (res.status === 422) {
    const body = await res.json().catch(() => null);
    return { ok: false, message: extractError(body) };
  }
  if (!res.ok) return { ok: false, message: "Failed to update category. Please try again." };

  return { ok: true };
}

export async function deleteCategory(id: number): Promise<CategoryActionResult> {
  let base: string;
  try {
    base = getApiBase();
  } catch {
    return { ok: false, message: "Server misconfiguration." };
  }

  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${base}/admin/categories/${id}`, {
      method: "DELETE",
      headers: buildAuthHeaders(token),
      cache: "no-store",
    });
  } catch {
    return { ok: false, message: "Backend is temporarily unavailable. Please try again." };
  }

  if (res.status === 401 || res.status === 403) return { ok: false, sessionExpired: true };
  if (res.status === 404) return { ok: false, message: "Category not found. It may have already been deleted." };
  if (res.status === 409) return { ok: false, message: "This category is currently in use and cannot be deleted." };
  if (!res.ok) return { ok: false, message: "Failed to delete category. Please try again." };

  return { ok: true };
}
