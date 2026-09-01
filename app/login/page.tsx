"use client";

import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { useState } from "react";
import { useRouter } from "next/navigation";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSuccess(response: CredentialResponse) {
    const credential = response.credential;
    if (!credential) {
      setError("Google sign-in did not return a credential. Please try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (res.status === 403) {
        setError("You do not have administrator access.");
      } else {
        setError(
          (data as { message?: string }).message ??
            "Authentication failed. Please try again."
        );
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleError() {
    setError("Google sign-in failed. Please try again.");
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center gap-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              HobbyLab Admin
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Sign in to access the admin panel
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="w-full rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 text-center"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col items-center gap-4 w-full">
            {loading ? (
              <p className="text-sm text-gray-400">Signing in…</p>
            ) : (
              <GoogleLogin onSuccess={handleSuccess} onError={handleError} />
            )}
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
