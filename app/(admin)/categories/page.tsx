import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { CategoryListResponse } from "@/types/auth";
import CategoriesClient from "@/components/CategoriesClient";

const PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function CategoriesPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { data, status } = await apiFetch<CategoryListResponse>(
    `/admin/categories?limit=${PAGE_SIZE}&offset=${offset}`
  );

  if (status === 401 || status === 403) {
    redirect("/api/auth/logout");
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-700">Failed to load categories</p>
        <p className="mt-1 text-sm text-red-600">
          The server returned an error. Please try again later.
        </p>
      </div>
    );
  }

  const { items, total } = data;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <CategoriesClient
      items={items}
      total={total}
      page={page}
      totalPages={totalPages}
    />
  );
}
