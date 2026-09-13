"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Signup failed. No user was returned.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("user_profiles").insert({
      id: data.user.id,
      role: role,
      full_name: fullName,
    });

    if (profileError) {
      setError(`Profile creation failed: ${profileError.message}`);
      setLoading(false);
      return;
    }

    router.push(role === "doctor" ? "/dashboard" : "/screening");
  }

  const inputClass =
    "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sky-50 px-4 relative py-12">
      <div className="w-full max-w-md mb-4">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition">
          ← Back to home
        </Link>
      </div>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/" className="inline-block hover:opacity-80 transition">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            CKD One
          </p>
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          Create an account
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign up to access the CKD screening tool.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">I am a...</span>
            <div className="flex w-full rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setRole("patient")}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  role === "patient" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Patient
              </button>
              <button
                type="button"
                onClick={() => setRole("doctor")}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  role === "doctor" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Doctor
              </button>
            </div>
          </div>

          <label className="flex flex-col">
            <span className="text-sm font-medium text-slate-700">Full name</span>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Jane Doe"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-sm font-medium text-slate-700">Email</span>
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
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="At least 6 characters"
            />
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-sky-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-sky-700 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
