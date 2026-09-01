import { redirect } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { UserListItem, UserListResponse } from "@/types/auth";

const PAGE_SIZE = 50;

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { data, status } = await apiFetch<UserListResponse>(
    `/admin/users?limit=${PAGE_SIZE}&offset=${offset}`
  );

  if (status === 401 || status === 403) {
    redirect("/api/auth/logout");
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-700">Failed to load users</p>
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Users</h1>
        <span className="text-sm text-gray-400">{total} total</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {(
                  [
                    "Name",
                    "Email",
                    "Provider",
                    "Status",
                    "System admin",
                    "Created",
                  ] as const
                ).map((heading) => (
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
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-gray-400"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                items.map((user: UserListItem) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {user.name ?? (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {user.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {user.provider ?? (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {user.status ? (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-700">
                          {user.status}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {user.is_system_admin ? (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          Admin
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {formatDate(user.created_at)}
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
              href={`/users?page=${page - 1}`}
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
              href={`/users?page=${page + 1}`}
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
