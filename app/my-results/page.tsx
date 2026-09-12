"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";

const API_URL = "http://127.0.0.1:8000/patients";

type Patient = {
  id: string;
  patient_name: string;
  created_at: string;
  risk_score: number;
  risk_percentage: string;
  trust_stability: string;
  boundary_near?: boolean;
  boundary_message?: string;
};

function riskPercent(p: Patient): number {
  if (typeof p.risk_score === "number" && Number.isFinite(p.risk_score)) {
    return p.risk_score * 100;
  }
  const parsed = Number.parseFloat(String(p.risk_percentage).replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function riskLevel(percent: number): "lower" | "moderate" | "higher" {
  if (percent < 30) return "lower";
  if (percent <= 70) return "moderate";
  return "higher";
}

function riskBadge(percent: number) {
  const level = riskLevel(percent);
  if (level === "lower") {
    return { label: "Lower Risk", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" };
  }
  if (level === "moderate") {
    return { label: "Moderate Risk", cls: "bg-amber-50 text-amber-900 border-amber-200" };
  }
  return { label: "Higher Risk", cls: "bg-red-50 text-red-800 border-red-200" };
}

function stabilityBadge(stability: string) {
  if (stability === "stable") {
    return { label: "Stable", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" };
  }
  if (stability === "borderline") {
    return { label: "Borderline", cls: "bg-amber-50 text-amber-900 border-amber-200" };
  }
  return { label: "Unstable", cls: "bg-red-50 text-red-800 border-red-300" };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function MyResultsContent() {
  const router = useRouter();
  const [screenings, setScreenings] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user && !cancelled) {
          const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', user.id).single();
          if (profile?.full_name) {
            setPatientName(profile.full_name);
          }
        }

        const fetchUrl = user ? `${API_URL}?created_by=${user.id}` : API_URL;
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data: Patient[] = await res.json();
        
        // Sort descending by date
        const sorted = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        if (!cancelled) setScreenings(sorted);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? `Could not load your screenings: ${err.message}`
              : "Something went wrong. Please try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Delete this screening? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setScreenings((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert("Error deleting screening.");
    }
  }

  const initials = patientName 
    ? patientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : 'PT';

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-slate-200 bg-white z-20">
        <div className="flex h-16 items-center px-6">
          <Link href="/my-results" className="text-xl font-bold tracking-tight text-sky-700">
            CKD One
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          <Link href="/my-results" className="flex items-center gap-3 rounded-md bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700">
            <svg className="h-5 w-5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            My Results
          </Link>
          <Link href="/screening" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Screening
          </Link>
          <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-400 cursor-not-allowed">
            <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Reports
          </div>
          <Link href="/assistant" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            AI Assistant
          </Link>
          <Link href="/history" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            History
          </Link>
        </nav>
        
        <div className="px-3 pb-4">
          <div className="mb-2 space-y-1">
             <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-400 cursor-not-allowed">
                <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
             </div>
             <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-400 cursor-not-allowed">
                <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Help
             </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
             <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                   {initials}
                </div>
                <div className="flex flex-col truncate">
                   <span className="truncate text-sm font-semibold text-slate-900">{patientName || 'Patient'}</span>
                   <span className="truncate text-xs text-slate-500">Patient</span>
                </div>
             </div>
             <button
               onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
               className="p-1 text-slate-400 hover:text-slate-600 transition"
               title="Log out"
             >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8">
          <div className="flex flex-1 items-center gap-4">
             <div className="relative w-full max-w-md">
                <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                   type="text"
                   placeholder="Search results..."
                   className="w-full rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
                />
             </div>
          </div>
          <div className="flex items-center gap-4 ml-4">
             <button className="relative text-slate-400 hover:text-slate-600 transition">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
             </button>
             <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                {initials}
             </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
           <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {patientName ? `Welcome back, ${patientName}` : "Welcome back"}
                </h1>
                <p className="mt-1 text-sm text-slate-500">Here is your screening history.</p>
              </div>
              <div className="flex items-center gap-3">
                 <Link href="/screening" className="inline-flex items-center justify-center rounded-lg border border-transparent bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700">
                    New Screening
                 </Link>
              </div>
           </div>

        {/* loading */}
        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
            <p className="text-sm text-slate-500">Loading your results…</p>
          </div>
        ) : error ? (
          /* error */
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            {error}
          </div>
        ) : screenings.length === 0 ? (
          /* empty state */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <svg className="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">No screenings yet</h2>
            <p className="mt-2 text-sm text-slate-500">You haven't completed a screening yet.</p>
            <Link
              href="/screening"
              className="mt-6 rounded-lg bg-sky-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
            >
              Start Your First Screening
            </Link>
          </div>
        ) : (
          /* results list */
          <div className="flex flex-col gap-4">
            {screenings.map((p, i) => {
              const pct = riskPercent(p);
              const risk = riskBadge(pct);
              const stab = stabilityBadge(p.trust_stability);
              
              return (
                <div
                  key={p.id ?? i}
                  onClick={() => router.push(`/dashboard/${p.id}`)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md cursor-pointer group"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{formatDate(p.created_at)}</p>
                    <p className="mt-1 text-sm text-slate-500">View detailed report and explanation</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xl font-bold text-slate-800">{pct.toFixed(1)}%</span>
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${risk.cls}`}>
                      {risk.label}
                    </span>
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${stab.cls}`}>
                      {stab.label}
                    </span>
                    
                    {p.boundary_near ? (
                      <span 
                        title={p.boundary_message || "Your result is close to a clinical boundary. Because of natural day-to-day changes in lab values, this classification could shift."}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900 cursor-help"
                      >
                        Near Boundary
                        <svg className="h-3.5 w-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    ) : null}
                    
                    <button 
                      onClick={(e) => handleDelete(p.id, e)}
                      className="ml-2 text-slate-300 hover:text-red-600 transition opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                    <span className="text-slate-400">→</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </main>
      </div>
    </div>
  );
}

export default function MyResultsPage() {
  return (
    <AuthGuard>
      <MyResultsContent />
    </AuthGuard>
  );
}
