import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { AdminUser } from "@/types/auth";
import NavLink from "@/components/NavLink";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/users", label: "Users" },
  { href: "/organizations", label: "Organizations" },
  { href: "/events", label: "Events" },
  { href: "/categories", label: "Categories" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: user, status } = await apiFetch<AdminUser>("/admin/me");

  if (status !== 200) {
    redirect("/api/auth/logout");
  }

  const displayName = user!.name ?? user!.email;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <span className="shrink-0 text-sm font-semibold text-gray-900">
            HobbyLab Admin
          </span>
          <div className="flex min-w-0 items-center gap-4">
            <span className="hidden truncate text-sm text-gray-500 sm:block">
              {displayName}
            </span>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="shrink-0 cursor-pointer text-sm text-red-600 hover:text-red-700"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav
            aria-label="Main navigation"
            className="flex items-center gap-1 overflow-x-auto py-2"
          >
            {NAV_ITEMS.map(({ href, label }) => (
              <NavLink key={href} href={href}>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
