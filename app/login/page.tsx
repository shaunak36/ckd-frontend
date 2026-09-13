"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  async function handleResetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetMessage(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setResetMessage("If an account exists for this email, a reset link has been sent.");
    }
    setLoading(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Login failed. No user returned.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      console.warn("Could not fetch user profile, defaulting to /my-results", profileError);
      router.push("/my-results");
      return;
    }

    console.log("role:", profile?.role);

    if (profile.role === "doctor") {
      router.push("/dashboard");
    } else {
      router.push("/my-results");
    }
  }

  const inputClass =
    "mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm outline-none transition focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-900/50";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sky-50 dark:bg-sky-900/30 px-4 relative py-12">
      <div className="w-full max-w-md mb-4">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">
          ← Back to home
        </Link>
      </div>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
        <Link href="/" className="inline-block hover:opacity-80 transition">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
            CKD One
          </p>
        </Link>
        
        {forgotPasswordMode ? (
          <>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Reset Password
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Enter your email to receive a password reset link.
            </p>

            <form onSubmit={handleResetPassword} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </label>

              {error && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-800 dark:text-red-300">
                  {error}
                </div>
              )}

              {resetMessage && (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
                  {resetMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 rounded-lg bg-sky-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              <button 
                onClick={() => {
                  setForgotPasswordMode(false);
                  setError(null);
                  setResetMessage(null);
                }}
                className="font-medium text-sky-700 dark:text-sky-400 hover:underline"
              >
                Back to log in
              </button>
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Log in
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Enter your credentials to continue.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </label>

              <label className="flex flex-col">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Password</span>
                  <button 
                    type="button"
                    onClick={() => {
                      setForgotPasswordMode(true);
                      setError(null);
                    }}
                    className="text-xs font-medium text-sky-700 dark:text-sky-400 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Your password"
                />
              </label>

              {error && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-800 dark:text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 rounded-lg bg-sky-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Logging in…" : "Log in"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-medium text-sky-700 dark:text-sky-400 hover:underline">
                Sign up
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
