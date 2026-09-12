"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/patients`;

/* ---------- types ---------- */

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

/* ---------- helpers (mirrored from main page) ---------- */

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
    return { label: "Lower", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" };
  }
  if (level === "moderate") {
    return { label: "Moderate", cls: "bg-amber-50 text-amber-900 border-amber-200" };
  }
  return { label: "Higher", cls: "bg-red-50 text-red-800 border-red-200" };
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

/* ---------- sort arrow indicator ---------- */

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-slate-300">↕</span>;
  return <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

/* ---------- component ---------- */

function DashboardContent() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [doctorName, setDoctorName] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState<RiskFilter>("all");

  /* fetch on mount */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user && !cancelled) {
          const { data: profile } = await supabase.from('user_profiles').select('full_name, role').eq('id', user.id).single();
          
          if (profile?.role === "patient") {
            router.push("/my-results");
            return;
          }

          if (profile?.full_name) {
            setDoctorName(profile.full_name);
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

  /* derived data */
  const totalPatients = patients.length;
  const highRiskCount = patients.filter((p) => p.risk_score > 0.7).length;
  const unstableCount = patients.filter((p) => p.trust_stability === "unstable").length;

  /* filter */
  const filtered = patients.filter((p) => {
    if (filter === "all") return true;
    return riskLevel(riskPercent(p)) === filter;
  });

  /* sort */
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
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function handleSaveEdit(id: string, e: React.MouseEvent | React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!editName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_name: editName }),
      });
      if (!res.ok) throw new Error("Failed to update name");
      setPatients(prev => prev.map(p => p.id === id ? { ...p, patient_name: editName } : p));
      setEditingId(null);
    } catch (err) {
      alert("Error updating name.");
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm("Delete this screening? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setPatients(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert("Error deleting screening.");
    }
  }

  /* ---------- render ---------- */
  
  const initials = doctorName 
    ? doctorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : 'DR';

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
          <Link href="/dashboard" className="flex items-center gap-3 rounded-md bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700">
            <svg className="h-5 w-5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                   <span className="truncate text-sm font-semibold text-slate-900">{doctorName || 'Doctor'}</span>
                   <span className="truncate text-xs text-slate-500">Nephrologist</span>
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
                   placeholder="Search patients, reports..."
                   className="w-full rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
                />
             </div>
          </div>
          <div className="flex items-center gap-4 ml-4">
             <button className="relative text-slate-400 hover:text-slate-600 transition">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute right-0 top-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
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
                  {doctorName ? `Good morning, Dr. ${doctorName}` : "Good morning"}
                </h1>
                <p className="mt-1 text-sm text-slate-500">Here is what's happening with your patients today.</p>
              </div>
              <div className="flex items-center gap-3">
                 <Link href="/screening" className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
                    Upload Report
                 </Link>
                 <Link href="/screening" className="inline-flex items-center justify-center rounded-lg border border-transparent bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700">
                    New Screening
                 </Link>
              </div>
           </div>

           {loading ? (
             <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
               <p className="text-sm text-slate-500">Loading patient data…</p>
             </div>
           ) : error ? (
             <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
               {error}
             </div>
           ) : (
             <div className="flex flex-col gap-8">
               {/* stats */}
               <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                 <StatCard 
                    label="Total Screened" 
                    value={totalPatients} 
                    color="sky" 
                    icon={<path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />}
                 />
                 <StatCard 
                    label="Higher Risk" 
                    value={highRiskCount} 
                    color="red" 
                    icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />}
                 />
                 <StatCard 
                    label="Unstable Results" 
                    value={unstableCount} 
                    color="amber" 
                    icon={<path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />}
                 />
               </div>

               {/* table section */}
               <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                 <div className="border-b border-slate-200 px-6 py-5 flex items-center justify-between bg-white">
                    <h2 className="text-base font-semibold text-slate-900">Recent Screenings</h2>
                    
                    <div className="flex items-center gap-3">
                      <label htmlFor="risk-filter" className="text-sm font-medium text-slate-600">
                        Filter:
                      </label>
                      <select
                        id="risk-filter"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as RiskFilter)}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="all">All</option>
                        <option value="lower">Lower (&lt;30%)</option>
                        <option value="moderate">Moderate (30–70%)</option>
                        <option value="higher">Higher (&gt;70%)</option>
                      </select>
                    </div>
                 </div>
                 
                 {sorted.length === 0 ? (
                   <div className="p-12 text-center text-sm text-slate-500">
                     {totalPatients === 0
                       ? "No patients have been screened yet."
                       : "No patients match the selected filter."}
                   </div>
                 ) : (
                   <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm">
                       <thead>
                         <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                           <th className="px-6 py-4">Patient Name</th>
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
                            <th className="px-6 py-4">Risk Level</th>
                            <th className="px-6 py-4">Stability</th>
                            <th className="px-6 py-4 text-right">Actions</th>
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
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setEditingId(p.id); setEditName(p.patient_name || ""); }}
                                        className="hover:text-sky-600 transition"
                                        title="Edit"
                                      >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                      </button>
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
                 )}
               </div>
             </div>
           )}
        </main>
      </div>
    </div>
  );
}

/* ---------- stat card ---------- */

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: "sky" | "red" | "amber";
  icon: React.ReactNode;
}) {
  const styles = {
    sky: "bg-white",
    red: "bg-white",
    amber: "bg-white",
  };
  const iconBg = {
    sky: "bg-sky-50 text-sky-600",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
  };
  
  return (
    <div className={`rounded-xl border border-slate-200 p-6 shadow-sm flex items-center gap-4 ${styles[color]}`}>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg[color]}`}>
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
           {icon}
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
