import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { OrgListResponse, CategoryListResponse } from "@/types/api";
import OrganizationsClient from "@/components/OrganizationsClient";

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function OrganizationsPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [orgsResult, catsResult] = await Promise.all([
    apiFetch<OrgListResponse>(
      `/admin/organizations?limit=${PAGE_SIZE}&offset=${offset}`
    ),
    // Categories are needed for the org form; failure is non-critical —
    // the table still renders and category selection shows "none available".
    apiFetch<CategoryListResponse>(`/admin/categories?limit=100`),
  ]);

  if (orgsResult.status === 401 || orgsResult.status === 403) {
    redirect("/api/auth/logout");
  }

  if (!orgsResult.data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-700">Failed to load organizations</p>
        <p className="mt-1 text-sm text-red-600">
          The server returned an error. Please try again later.
        </p>
      </div>
    );
  }

  const { items, total } = orgsResult.data;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const categories = catsResult.data?.items ?? [];

  return (
    <OrganizationsClient
      items={items}
      total={total}
      page={page}
      totalPages={totalPages}
      categories={categories}
    />
  );
}
