import { redirect } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { CategoryListItem, CategoryListResponse } from "@/types/auth";
import CategoryIcon from "@/components/CategoryIcon";

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
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const HEADINGS = ["ID", "English", "Russian", "Hebrew", "Name", "Icon"] as const;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Categories</h1>
        <span className="text-sm text-gray-400">{total} total</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {HEADINGS.map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={HEADINGS.length}
                    className="px-4 py-10 text-center text-sm text-gray-400"
                  >
                    No categories found.
                  </td>
                </tr>
              ) : (
                items.map((cat: CategoryListItem) => (
                  <tr
                    key={cat.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-400">
                      {cat.id}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {cat.name_en ?? (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {cat.name_ru ?? (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td
                      dir="auto"
                      className="whitespace-nowrap px-4 py-3 text-sm text-gray-700"
                    >
                      {cat.name_he ?? (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {cat.name ?? (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {cat.icon_url ? (
                        <CategoryIcon url={cat.icon_url} />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {hasPrev ? (
            <Link
              href={`/categories?page=${page - 1}`}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              ← Previous
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-lg border border-gray-100 px-4 py-2 text-gray-300">
              ← Previous
            </span>
          )}

          <span className="text-gray-500">
            Page {page} of {totalPages}
          </span>

          {hasNext ? (
            <Link
              href={`/categories?page=${page + 1}`}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              Next →
            </Link>
          ) : (
            <span className="cursor-not-allowed rounded-lg border border-gray-100 px-4 py-2 text-gray-300">
              Next →
            </span>
          )}
        </div>
      )}
    </div>
  );
}
