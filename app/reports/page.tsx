"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/patients`;

type PatientRecord = {
  id: string;
  patient_name: string;
  created_at: string;
  risk_score: number;
  trust_stability: string;
  inputs: Record<string, string | number>;
};

type AccuracyStats = {
  real_world_accuracy: number;
  matched: number;
  total_confirmed: number;
};

function ReportsContent() {
  const router = useRouter();

  const [userRole, setUserRole] = useState<"doctor" | "patient" | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [accuracy, setAccuracy] = useState<AccuracyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .single();

        if (profile) {
          if (profile.role === "patient") {
            router.push("/my-results");
            return;
          }
          if (!cancelled) {
            setUserRole(profile.role);
            setUserName(profile.full_name || "");
          }
        }

        const [res, accRes] = await Promise.all([
          fetch(`${API_URL}?created_by=${user.id}`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/accuracy-stats`)
        ]);

        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        
        const data: PatientRecord[] = await res.json();
        let accData = null;
        if (accRes.ok) {
          accData = await accRes.json();
        }

        if (!cancelled) {
          setPatients(data);
          if (accData) setAccuracy(accData);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong.");
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function riskPercent(score: number) {
    return Math.round(score * 100);
  }

  function riskLevel(percent: number) {
    if (percent <= 30) return "Lower Risk";
    if (percent <= 70) return "Moderate Risk";
    return "Higher Risk";
  }

  function isQuickScreen(p: PatientRecord) {
    return !p.inputs || p.inputs.age === undefined || p.inputs.age === null;
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

  const handleDownloadCSV = () => {
    const headers = ["Patient Name", "Date", "Risk %", "Risk Level", "Stability", "Screen Type"];
    
    const rows = patients.map(p => {
      const pct = riskPercent(p.risk_score);
      const rl = riskLevel(pct);
      const st = isQuickScreen(p) ? "Quick" : "Detailed";
      // sanitize date string for CSV (remove commas)
      const dateStr = formatDate(p.created_at).replace(/,/g, "");
      const nameStr = (p.patient_name || "Unnamed").replace(/,/g, "");
      
      return [
        `"${nameStr}"`,
        `"${dateStr}"`,
        `${pct}%`,
        `"${rl}"`,
        `"${p.trust_stability}"`,
        `"${st}"`
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ckd_reports_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const initials = userName 
    ? userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : 'DR';

  const total = patients.length;
  const lowerCount = patients.filter(p => riskPercent(p.risk_score) <= 30).length;
  const modCount = patients.filter(p => riskPercent(p.risk_score) > 30 && riskPercent(p.risk_score) <= 70).length;
  const higherCount = patients.filter(p => riskPercent(p.risk_score) > 70).length;
  const quickCount = patients.filter(p => isQuickScreen(p)).length;
  const detailedCount = total - quickCount;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-slate-200 bg-white z-20">
        <div className="flex h-16 items-center px-6">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight text-sky-700">
            CKD One
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Overview
          </Link>
          <Link href="/screening" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Screening
          </Link>
          <Link href="/patients" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Patients
          </Link>
          <Link href="/reports" className="flex items-center gap-3 rounded-md bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700">
            <svg className="h-5 w-5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Reports
          </Link>
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
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
             <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                   {initials}
                </div>
                <div className="flex flex-col truncate">
                   <span className="truncate text-sm font-semibold text-slate-900">{userName || 'Doctor'}</span>
                   <span className="truncate text-xs text-slate-500">Nephrologist</span>
                </div>
             </div>
             <button onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }} className="p-1 text-slate-400 hover:text-slate-600 transition">
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
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Reports</h1>
          </div>
          <div className="flex items-center gap-4 ml-4">
             <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                {initials}
             </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
           {loading ? (
             <p className="text-sm text-slate-500">Loading reports...</p>
           ) : error ? (
             <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}</div>
           ) : (
             <div className="max-w-4xl">
               <div className="mb-8 flex items-center justify-between">
                 <div>
                   <h2 className="text-2xl font-bold text-slate-900">Summary Statistics</h2>
                   <p className="text-sm text-slate-500 mt-1">Aggregated data across all patient screenings.</p>
                 </div>
                 <button 
                   onClick={handleDownloadCSV}
                   className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
                 >
                   <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                   </svg>
                   Download CSV
                 </button>
               </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Accuracy Card */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="font-semibold text-slate-900 mb-4">Real-World Accuracy</h3>
                    {accuracy ? (
                      <div className="flex flex-col justify-center h-full pb-6">
                        {accuracy.total_confirmed === 0 ? (
                          <p className="text-sm text-slate-500">No confirmed outcomes yet.</p>
                        ) : (
                          <>
                            <div className="text-4xl font-extrabold text-sky-700 mb-2">
                              {(accuracy.real_world_accuracy * 100).toFixed(1)}%
                            </div>
                            <p className="text-sm font-medium text-slate-600">
                              {accuracy.matched} / {accuracy.total_confirmed} confirmed cases matched
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Loading...</p>
                    )}
                  </div>

                  {/* Risk Breakdown Card */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="font-semibold text-slate-900 mb-4">Risk Level Breakdown</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Total Screenings</span>
                        <span className="text-sm font-bold text-slate-900">{total}</span>
                      </div>
                      <div className="h-px w-full bg-slate-100" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-red-600 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span> Higher Risk
                        </span>
                        <span className="text-sm font-semibold text-slate-900">{higherCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-amber-600 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span> Moderate Risk
                        </span>
                        <span className="text-sm font-semibold text-slate-900">{modCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-emerald-600 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Lower Risk
                        </span>
                        <span className="text-sm font-semibold text-slate-900">{lowerCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Screen Type Card */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="font-semibold text-slate-900 mb-4">Screening Methods</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Quick Screen (8 values)</span>
                        <span className="text-sm font-bold text-slate-900">{quickCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Detailed Screen (24 values)</span>
                        <span className="text-sm font-bold text-slate-900">{detailedCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
             </div>
           )}
        </main>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <AuthGuard>
      <ReportsContent />
    </AuthGuard>
  );
}
