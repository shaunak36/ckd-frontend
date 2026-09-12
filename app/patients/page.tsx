"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import { LineChart, Line, YAxis, ReferenceLine, ResponsiveContainer } from "recharts";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/patients`;

type PatientRecord = {
  id: string;
  patient_name: string;
  created_at: string;
  risk_score: number;
  trust_stability: string;
  clinical_outcome?: string;
  inputs: Record<string, string | number>;
};

type TrendPoint = {
  date: string;
  percent: number;
  timestamp: number;
};

type PatientGroup = {
  name: string;
  count: number;
  latestDate: string;
  latestRiskScore: number;
  latestRiskPercent: number;
  latestRiskLevel: string;
  outcome: string | null;
  trend: TrendPoint[];
};

type SortKey = "latestDate" | "name" | "latestRiskPercent";
type SortDir = "asc" | "desc";

function riskPercent(score: number) {
  return Math.round(score * 100);
}

function riskLevel(percent: number) {
  if (percent <= 30) return "Lower Risk";
  if (percent <= 70) return "Moderate Risk";
  return "Higher Risk";
}

function riskBadge(percent: number) {
  if (percent <= 30) {
    return { label: "Lower Risk", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  if (percent <= 70) {
    return { label: "Moderate Risk", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  }
  return { label: "Higher Risk", cls: "bg-red-50 text-red-700 border-red-200" };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return (
      <svg className="ml-1 inline h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  if (dir === "asc") {
    return (
      <svg className="ml-1 inline h-4 w-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  }
  return (
    <svg className="ml-1 inline h-4 w-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function PatientsContent() {
  const router = useRouter();

  const [userName, setUserName] = useState<string>("");
  const [patients, setPatients] = useState<PatientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("latestDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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
            setUserName(profile.full_name || "");
          }
        }

        const res = await fetch(`${API_URL}?created_by=${user.id}`);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        
        const data: PatientRecord[] = await res.json();
        if (!cancelled) {
          const map = new Map<string, PatientGroup>();
          data.forEach(p => {
             const name = p.patient_name || "Unnamed";
             const existing = map.get(name);
             const dt = new Date(p.created_at).getTime();
             const trendPt = {
               date: formatDate(p.created_at),
               percent: riskPercent(p.risk_score),
               timestamp: dt
             };
             
             if (!existing) {
                map.set(name, {
                  name, 
                  count: 1, 
                  latestDate: p.created_at,
                  latestRiskScore: p.risk_score, 
                  latestRiskPercent: riskPercent(p.risk_score),
                  latestRiskLevel: riskLevel(riskPercent(p.risk_score)), 
                  outcome: p.clinical_outcome || null,
                  trend: [trendPt]
                });
             } else {
                existing.count++;
                existing.trend.push(trendPt);
                if (dt > new Date(existing.latestDate).getTime()) {
                   existing.latestDate = p.created_at;
                   existing.latestRiskScore = p.risk_score;
                   existing.latestRiskPercent = riskPercent(p.risk_score);
                   existing.latestRiskLevel = riskLevel(riskPercent(p.risk_score));
                }
                if (p.clinical_outcome && !existing.outcome) {
                   existing.outcome = p.clinical_outcome;
                }
             }
          });
          
          const groups = Array.from(map.values());
          groups.forEach(g => {
             g.trend.sort((a, b) => a.timestamp - b.timestamp);
          });
          
          setPatients(groups);
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

  const initials = userName 
    ? userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : 'DR';

  const filtered = patients.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "latestDate") {
      cmp = new Date(a.latestDate).getTime() - new Date(b.latestDate).getTime();
    } else if (sortKey === "name") {
      cmp = a.name.localeCompare(b.name);
    } else {
      cmp = a.latestRiskPercent - b.latestRiskPercent;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

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
          <Link href="/patients" className="flex items-center gap-3 rounded-md bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700">
            <svg className="h-5 w-5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Patients
          </Link>
          <Link href="/reports" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Patients</h1>
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
             <p className="text-sm text-slate-500">Loading patients...</p>
           ) : error ? (
             <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}</div>
           ) : (
             <div className="max-w-6xl">
               <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                 <h2 className="text-lg font-semibold text-slate-900">Patient Directory</h2>
                 <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search patient name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                 </div>
               </div>

               {sorted.length === 0 ? (
                 <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                   <p className="text-sm text-slate-500">No patients match your search.</p>
                 </div>
               ) : (
                 <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                   <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm">
                       <thead className="border-b border-slate-200 bg-slate-50/50 text-slate-500">
                         <tr>
                           <th 
                             className="cursor-pointer select-none px-6 py-4 font-medium transition hover:text-sky-700"
                             onClick={() => toggleSort("name")}
                           >
                             Patient Name
                             <SortArrow active={sortKey === "name"} dir={sortDir} />
                           </th>
                           <th className="px-6 py-4 font-medium">Screenings</th>
                           <th
                             className="cursor-pointer select-none px-6 py-4 font-medium transition hover:text-sky-700"
                             onClick={() => toggleSort("latestDate")}
                           >
                             Latest Date
                             <SortArrow active={sortKey === "latestDate"} dir={sortDir} />
                           </th>
                           <th
                             className="cursor-pointer select-none px-6 py-4 font-medium transition hover:text-sky-700"
                             onClick={() => toggleSort("latestRiskPercent")}
                           >
                             Latest Risk
                             <SortArrow active={sortKey === "latestRiskPercent"} dir={sortDir} />
                           </th>
                           <th className="px-6 py-4 font-medium">Trend</th>
                           <th className="px-6 py-4 font-medium">Outcome Status</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {sorted.map((p, i) => {
                           const risk = riskBadge(p.latestRiskPercent);
                           return (
                             <tr
                               key={p.name}
                               className="cursor-pointer bg-white transition hover:bg-slate-50 group"
                               onClick={() => window.location.assign(`/history?patient=${encodeURIComponent(p.name)}`)}
                             >
                               <td className="px-6 py-4 font-medium text-slate-900 group-hover:text-sky-700">
                                 {p.name}
                               </td>
                               <td className="px-6 py-4 text-slate-500">
                                 {p.count}
                               </td>
                               <td className="px-6 py-4 text-slate-500">
                                 {formatDate(p.latestDate)}
                               </td>
                               <td className="px-6 py-4">
                                 <span className="font-semibold text-slate-900 mr-2">{p.latestRiskPercent}%</span>
                                 <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${risk.cls}`}>
                                   {risk.label}
                                 </span>
                               </td>
                               <td className="px-6 py-4">
                                 <div className="h-12 w-32 flex items-center">
                                   {p.count > 1 ? (
                                     <ResponsiveContainer width="100%" height="100%">
                                       <LineChart data={p.trend}>
                                         <YAxis domain={[0, 100]} hide={true} />
                                         <ReferenceLine y={30} stroke="#cbd5e1" strokeDasharray="3 3" />
                                         <ReferenceLine y={70} stroke="#cbd5e1" strokeDasharray="3 3" />
                                         <Line type="monotone" dataKey="percent" stroke="#0369a1" strokeWidth={2} dot={false} isAnimationActive={false} />
                                       </LineChart>
                                     </ResponsiveContainer>
                                   ) : (
                                     <span className="text-[10px] leading-tight text-slate-400">Available after 2+ screenings</span>
                                   )}
                                 </div>
                               </td>
                               <td className="px-6 py-4">
                                 {p.outcome ? (
                                   <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                      p.outcome === "confirmed_ckd" ? "bg-red-50 text-red-700 border-red-200" :
                                      p.outcome === "confirmed_not_ckd" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                      "bg-amber-50 text-amber-700 border-amber-200"
                                    }`}>
                                      {p.outcome === "confirmed_ckd" ? "CKD" : p.outcome === "confirmed_not_ckd" ? "Not CKD" : "Pending"}
                                   </span>
                                 ) : (
                                   <span className="text-slate-400 text-xs italic">Unconfirmed</span>
                                 )}
                               </td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}
             </div>
           )}
        </main>
      </div>
    </div>
  );
}

export default function PatientsPage() {
  return (
    <AuthGuard>
      <PatientsContent />
    </AuthGuard>
  );
}
