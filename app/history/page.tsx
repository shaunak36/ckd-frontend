"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/patients`;

type Patient = {
  id: string;
  patient_name: string;
  created_at: string;
  risk_score: number;
  risk_percentage: string;
  trust_stability: string;
};

type SortKey = "created_at" | "risk_score";
type SortDir = "asc" | "desc";
type RiskFilter = "all" | "lower" | "moderate" | "higher";

function riskPercent(p: Patient) {
  return Math.round(p.risk_score * 100);
}

function riskLevel(percent: number) {
  if (percent <= 30) return "lower";
  if (percent <= 70) return "moderate";
  return "higher";
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

function stabilityBadge(stability: string) {
  if (stability === "borderline") {
    return { label: "Borderline", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  }
  if (stability === "unstable") {
    return { label: "Unstable", cls: "bg-red-50 text-red-700 border-red-200" };
  }
  return { label: "Stable", cls: "bg-slate-50 text-slate-600 border-slate-200" };
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

function HistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientQuery = searchParams.get("patient");

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<"doctor" | "patient" | null>(null);

  const [filter, setFilter] = useState<RiskFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm("Delete this screening? This cannot be undone.")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setPatients(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert("Error deleting patient");
    }
  }

  async function handleSaveEdit(id: string, e: React.MouseEvent | React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_name: editName })
      });
      if (!res.ok) throw new Error('Failed to update');
      setPatients(prev => prev.map(p => p.id === id ? { ...p, patient_name: editName } : p));
      setEditingId(null);
    } catch (err) {
      alert("Error updating name");
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user && !cancelled) {
          const { data: profile } = await supabase.from('user_profiles').select('full_name, role').eq('id', user.id).single();
          
          if (profile) {
            setUserRole(profile.role);
            setUserName(profile.full_name || "");
          }
        }

        const fetchUrl = user ? `${API_URL}?created_by=${user.id}` : API_URL;
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data: Patient[] = await res.json();
        if (!cancelled) setPatients(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? `Could not load patients: ${err.message}`
              : "Something went wrong. Please check that the backend is running."
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

  const filtered = patients.filter((p) => {
    if (patientQuery && p.patient_name !== patientQuery) return false;
    if (filter === "all") return true;
    return riskLevel(riskPercent(p)) === filter;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "created_at") {
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else {
      cmp = a.risk_score - b.risk_score;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }



  const initials = userName 
    ? userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : (userRole === "doctor" ? "DR" : "PT");

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-slate-200 bg-white z-20">
        <div className="flex h-16 items-center px-6">
          <Link href={userRole === 'doctor' ? "/dashboard" : "/my-results"} className="text-xl font-bold tracking-tight text-sky-700">
            CKD One
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {userRole === 'doctor' ? (
            <>
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
              <Link href="/reports" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Reports
              </Link>
            </>
          ) : (
            <>
              <Link href="/my-results" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
            </>
          )}

          <Link href="/assistant" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            AI Assistant
          </Link>
          
          <Link href="/history" className="flex items-center gap-3 rounded-md bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700">
            <svg className="h-5 w-5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                   <span className="truncate text-sm font-semibold text-slate-900">{userName || (userRole === "doctor" ? "Doctor" : "Patient")}</span>
                   <span className="truncate text-xs text-slate-500">{userRole === "doctor" ? "Nephrologist" : "Patient"}</span>
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
            <h1 className="text-xl font-bold tracking-tight text-slate-900">History</h1>
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
             <p className="text-sm text-slate-500">Loading history...</p>
           ) : error ? (
             <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}</div>
           ) : (
             <div className="max-w-6xl">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {patientQuery ? `All screenings for ${patientQuery}` : "All Screenings"}
                  </h2>
                  <div className="flex gap-2">
                   {(["all", "lower", "moderate", "higher"] as RiskFilter[]).map((f) => (
                     <button
                       key={f}
                       onClick={() => setFilter(f)}
                       className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                         filter === f
                           ? "bg-slate-900 text-white"
                           : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-sm"
                       }`}
                     >
                       {f.charAt(0).toUpperCase() + f.slice(1)} Risk
                     </button>
                   ))}
                 </div>
               </div>

               {sorted.length === 0 ? (
                 <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                   <p className="text-sm text-slate-500">No screenings found.</p>
                 </div>
               ) : (
                 <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                   <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm">
                       <thead className="border-b border-slate-200 bg-slate-50/50 text-slate-500">
                         <tr>
                           <th className="px-6 py-4 font-medium">Patient</th>
                           <th
                             className="cursor-pointer select-none px-6 py-4 transition hover:text-sky-700"
                             onClick={() => toggleSort("created_at")}
                           >
                             Date
                             <SortArrow active={sortKey === "created_at"} dir={sortDir} />
                           </th>
                           <th
                             className="cursor-pointer select-none px-6 py-4 transition hover:text-sky-700"
                             onClick={() => toggleSort("risk_score")}
                           >
                             Risk %
                             <SortArrow active={sortKey === "risk_score"} dir={sortDir} />
                           </th>
                           <th className="px-6 py-4 font-medium">Risk Level</th>
                           <th className="px-6 py-4 font-medium">Stability</th>
                           <th className="px-6 py-4 font-medium text-right">Actions</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {sorted.map((p, i) => {
                           const pct = riskPercent(p);
                           const risk = riskBadge(pct);
                           const stab = stabilityBadge(p.trust_stability);
                            const isEditing = editingId === p.id;
                            
                            return (
                              <tr
                                key={p.id ?? `${p.patient_name}-${p.created_at}-${i}`}
                                className="cursor-pointer bg-white transition hover:bg-slate-50"
                                onClick={() => { if (!isEditing) window.location.assign(`/dashboard/${p.id}`); }}
                              >
                                <td className="px-6 py-4 font-medium text-slate-900" onClick={(e) => isEditing && e.stopPropagation()}>
                                  {isEditing ? (
                                    <form onSubmit={(e) => handleSaveEdit(p.id, e)} className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        autoFocus
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                                      />
                                    </form>
                                  ) : (
                                    <Link href={`/dashboard/${p.id}`} className="hover:text-sky-700">
                                      {p.patient_name || "Unnamed"}
                                    </Link>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                  {formatDate(p.created_at)}
                                </td>
                                <td className="px-6 py-4 font-semibold text-slate-900">
                                  {pct.toFixed(1)}%
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${risk.cls}`}>
                                    {risk.label}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${stab.cls}`}>
                                    {stab.label}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {isEditing ? (
                                    <div className="flex items-center justify-end gap-2">
                                      <button onClick={(e) => handleSaveEdit(p.id, e)} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">Save</button>
                                      <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="text-xs font-medium text-slate-500 hover:text-slate-700">Cancel</button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-3 text-slate-400">
                                      {userRole === "doctor" && (
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); setEditingId(p.id); setEditName(p.patient_name || ""); }}
                                          className="hover:text-sky-600 transition"
                                          title="Edit"
                                        >
                                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                      )}
                                      <button 
                                        onClick={(e) => handleDelete(p.id, e)}
                                        className="hover:text-red-600 transition"
                                        title="Delete"
                                      >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                      </button>
                                    </div>
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

export default function HistoryPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading...</div>}>
        <HistoryContent />
      </Suspense>
    </AuthGuard>
  );
}
