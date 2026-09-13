"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import ReactMarkdown from "react-markdown";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/patients`;

/* ---------- types ---------- */

type TopFactor = {
  feature: string;
  direction: string;
  impact: number;
};

type PatientRecord = {
  id: string;
  patient_name: string;
  created_at: string;
  risk_score: number;
  risk_percentage: string;
  top_factors: TopFactor[];
  trust_swing: number;
  trust_stability: "stable" | "borderline" | "unstable" | string;
  trust_message: string;
  boundary_near?: boolean;
  boundary_distance?: number;
  boundary_message?: string;
  clinical_outcome?: string;
  outcome_notes?: string;
  patient_summary?: string;
  /* raw input values are nested under inputs */
  inputs: Record<string, string | number>;
  [key: string]: unknown;
};

/* ---------- input field definitions (mirrors the form page) ---------- */

const INPUT_SECTIONS: { title: string; fields: { key: string; label: string; unit?: string }[] }[] = [
  {
    title: "Demographics",
    fields: [
      { key: "age", label: "Age", unit: "years" },
      { key: "bp", label: "Blood pressure", unit: "mmHg" },
    ],
  },
  {
    title: "Urine Tests",
    fields: [
      { key: "sg", label: "Specific gravity" },
      { key: "al", label: "Albumin" },
      { key: "su", label: "Sugar" },
      { key: "rbc", label: "Red blood cells" },
      { key: "pc", label: "Pus cells" },
      { key: "pcc", label: "Pus cell clumps" },
      { key: "ba", label: "Bacteria" },
    ],
  },
  {
    title: "Blood Tests",
    fields: [
      { key: "bgr", label: "Blood glucose random", unit: "mg/dL" },
      { key: "bu", label: "Blood urea", unit: "mg/dL" },
      { key: "sc", label: "Serum creatinine", unit: "mg/dL" },
      { key: "sod", label: "Sodium", unit: "mEq/L" },
      { key: "pot", label: "Potassium", unit: "mEq/L" },
      { key: "hemo", label: "Hemoglobin", unit: "g/dL" },
      { key: "pcv", label: "Packed cell volume", unit: "%" },
      { key: "wbcc", label: "White blood cell count", unit: "cells/cumm" },
      { key: "rbcc", label: "Red blood cell count", unit: "millions/cmm" },
    ],
  },
  {
    title: "Medical History",
    fields: [
      { key: "htn", label: "Hypertension" },
      { key: "dm", label: "Diabetes mellitus" },
      { key: "cad", label: "Coronary artery disease" },
      { key: "appet", label: "Appetite" },
      { key: "pe", label: "Pedal edema" },
      { key: "ane", label: "Anemia" },
    ],
  },
];

const FEATURE_LABELS: Record<string, string> = {
  age: "Age", bp: "Blood pressure", sg: "Specific gravity", al: "Albumin",
  su: "Sugar", rbc: "Red blood cells", pc: "Pus cells", pcc: "Pus cell clumps",
  ba: "Bacteria", bgr: "Blood glucose (random)", bu: "Blood urea",
  sc: "Serum creatinine", sod: "Sodium", pot: "Potassium", hemo: "Hemoglobin",
  pcv: "Packed cell volume", wbcc: "White blood cell count",
  rbcc: "Red blood cell count", htn: "Hypertension", dm: "Diabetes mellitus",
  cad: "Coronary artery disease", appet: "Appetite", pe: "Pedal edema", ane: "Anemia",
};

/* ---------- helpers (same logic as main page) ---------- */

function parseRiskPercent(p: PatientRecord): number {
  if (typeof p.risk_score === "number" && Number.isFinite(p.risk_score)) {
    return p.risk_score * 100;
  }
  const parsed = Number.parseFloat(String(p.risk_percentage).replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function riskBand(percent: number) {
  if (percent < 30) {
    return {
      label: "Lower estimated risk",
      barClass: "bg-emerald-500",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      textClass: "text-emerald-700",
    };
  }
  if (percent <= 70) {
    return {
      label: "Moderate estimated risk",
      barClass: "bg-amber-500",
      badgeClass: "bg-amber-50 text-amber-900 border-amber-200",
      textClass: "text-amber-700",
    };
  }
  return {
    label: "Higher estimated risk",
    barClass: "bg-red-500",
    badgeClass: "bg-red-50 text-red-800 border-red-200",
    textClass: "text-red-700",
  };
}

function trustStyles(stability: string) {
  if (stability === "stable") {
    return {
      label: "Stable — this result is consistent",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      icon: "✓",
    };
  }
  if (stability === "borderline") {
    return {
      label: "Borderline — interpret with some caution",
      badgeClass: "bg-amber-50 text-amber-900 border-amber-200",
      icon: "!",
    };
  }
  return {
    label: "Unstable — recommend retesting or clinical follow-up",
    badgeClass: "bg-red-50 text-red-800 border-red-300",
    icon: "⚠",
  };
}

function factorSentence(factor: TopFactor): string {
  const name = FEATURE_LABELS[factor.feature] ?? factor.feature;
  const direction = factor.direction.toLowerCase();
  if (direction.includes("increase")) return `${name} is increasing the risk`;
  if (direction.includes("decrease")) return `${name} is decreasing the risk`;
  return `${name} has little effect on this estimate`;
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

function formatValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "number") return String(val);
  return String(val);
}

/* ---------- component ---------- */

function PatientDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [userRole, setUserRole] = useState<"doctor" | "patient" | null>(null);
  const [userName, setUserName] = useState("");

  async function handleSendChat(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || !patient) return;

    const question = chatInput.trim();
    setChatInput("");
    setChatError(null);
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setChatLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patient.id, question }),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      const data = await res.json();
      const answer = data.answer || data.response || data.message || "No response provided.";
      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch (err) {
      setChatError("Failed to send message. Please try again.");
    } finally {
      setChatLoading(false);
    }
  }

  const [outcomeSaving, setOutcomeSaving] = useState(false);
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [outcomeError, setOutcomeError] = useState<string | null>(null);

  async function handleUpdateOutcome(outcomeVal: string) {
    if (!patient) return;
    setOutcomeSaving(true);
    setOutcomeError(null);
    try {
      const res = await fetch(`${API_URL}/${patient.id}/outcome`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinical_outcome: outcomeVal, outcome_notes: outcomeNotes }),
      });
      if (!res.ok) throw new Error("Failed to save clinical outcome");
      setPatient({ ...patient, clinical_outcome: outcomeVal, outcome_notes: outcomeNotes });
    } catch (err) {
      setOutcomeError(err instanceof Error ? err.message : "Error saving outcome");
    } finally {
      setOutcomeSaving(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !cancelled) {
          const { data: profile } = await supabase.from('user_profiles').select('role, full_name').eq('id', user.id).single();
          if (profile) {
          setUserRole(profile.role);
          setUserName(profile.full_name || "");
        }
        }

        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data: PatientRecord[] = await res.json();
        const match = data.find((p) => String(p.id) === id);
        if (!cancelled) {
          if (match) {
            setPatient(match);
            if (match.outcome_notes) setOutcomeNotes(match.outcome_notes);
          } else {
            setNotFound(true);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? `Could not load patient data: ${err.message}`
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
  }, [id]);

  /* ---------- render ---------- */

  
  const initials = userName 
    ? userName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() 
    : (userRole === 'doctor' ? 'DR' : 'PT');

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-20">
        <div className="flex h-16 items-center px-6">
          <Link href={userRole === 'doctor' ? "/dashboard" : "/my-results"} className="text-xl font-bold tracking-tight text-sky-700 dark:text-sky-400">
            <Image src="/logo.png" alt="CKD One Logo" width={120} height={50} priority className="object-contain" />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {userRole === 'doctor' ? (
            <>
              <Link href="/dashboard" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50">
                <svg className="h-5 w-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Overview
              </Link>
              <Link href="/screening" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50">
                <svg className="h-5 w-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Screening
              </Link>
              <Link href="/patients" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50">
                <svg className="h-5 w-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Patients
              </Link>
              <Link href="/reports" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50">
                <svg className="h-5 w-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Reports
              </Link>
            </>
          ) : (
            <>
              <Link href="/my-results" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50">
                <svg className="h-5 w-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                My Results
              </Link>
              <Link href="/screening" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50">
                <svg className="h-5 w-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Screening
              </Link>
              <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-400 dark:text-slate-500 cursor-not-allowed">
                <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Reports
              </div>
            </>
          )}

          <Link href="/assistant" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50">
            <svg className="h-5 w-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            AI Assistant
          </Link>
          
          <Link href="/history" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50">
            <svg className="h-5 w-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            History
          </Link>
        </nav>
        
        <div className="px-3 pb-4">
          <div className="mb-2 space-y-1">
             <Link href="/settings" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50">
                <svg className="h-5 w-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
             </Link>
             <Link href="/help" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50">
                <svg className="h-5 w-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Help
             </Link>
          </div>

          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Theme</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
             <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sm font-bold text-sky-700 dark:text-sky-400">
                   {initials}
                </div>
                <div className="flex flex-col truncate">
                   <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{userName || 'User'}</span>
                   <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                     {userRole === 'doctor' ? 'Nephrologist' : 'Patient'}
                   </span>
                </div>
             </div>
             <button
               onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
               className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
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
        <main className="flex-1 p-8">
          <div className="flex flex-col gap-8">

        {/* header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
              Clinical Screening Tool
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Patient Record
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL}/patients/${id}/report-pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-800"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF Report
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-sky-700 dark:text-sky-400 shadow-sm transition hover:bg-sky-50"
            >
              ← Back to dashboard
            </Link>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Log out
            </button>
          </div>
        </div>

        {/* loading */}
        {loading && (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 shadow-sm">
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading patient record…</p>
          </div>
        )}

        {/* error */}
        {error && (
          <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-5 text-sm text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {/* not found */}
        {notFound && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">Patient not found</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              No record with ID &ldquo;{id}&rdquo; exists. It may have been deleted or the link may be incorrect.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-block rounded-lg bg-sky-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
            >
              Return to dashboard
            </Link>
          </div>
        )}

        {/* patient detail */}
        {patient && (() => {
          const percent = parseRiskPercent(patient);
          const band = riskBand(percent);
          const trust = trustStyles(patient.trust_stability);

          return (
            <>
              {/* patient name & date */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                    {patient.patient_name || "Unnamed"}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Screened {formatDate(patient.created_at)}
                  </p>
                </div>
              </div>

              {/* risk result card — mirrors main page layout */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm sm:p-8">
                {patient.patient_summary && (
                  <div className="mb-6 rounded-xl border border-sky-100 bg-sky-50/50 p-5 shadow-sm">
                    <div className="flex gap-4">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-400">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-[15px] font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                        {patient.patient_summary}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* large percentage */}
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Estimated CKD risk
                  </p>
                  <p className={`text-6xl font-extrabold ${band.textClass}`}>
                    {percent.toFixed(1)}%
                  </p>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${band.badgeClass}`}>
                    {band.label}
                  </span>
                </div>

                {/* progress bar */}
                <div className="mt-6">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${band.barClass}`}
                      style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-slate-400 dark:text-slate-500">
                    <span>0%</span>
                    <span>30%</span>
                    <span>70%</span>
                    <span>100%</span>
                  </div>
                  <p className="mt-1 text-center text-xs text-slate-400 dark:text-slate-500">
                    Green under 30%, yellow 30–70%, red over 70%.
                  </p>
                </div>

                {/* trust card */}
                {userRole === "doctor" ? (
                  <div className={`mt-6 rounded-xl border p-4 ${trust.badgeClass}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{trust.icon}</span>
                      <p className="text-sm font-semibold">Explanation Confidence: {trust.label}</p>
                    </div>
                    <p className="mt-1 text-sm">{patient.trust_message}</p>
                    <p className="mt-1 text-xs opacity-70">
                      Swing under 5% simulated lab noise: {(patient.trust_swing * 100).toFixed(1)} percentage points
                    </p>
                  </div>
                ) : (
                  <div className={`mt-6 rounded-xl border p-4 ${trust.badgeClass}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{trust.icon}</span>
                      <p className="text-sm font-semibold">Explanation Confidence</p>
                    </div>
                    <p className="mt-1 text-sm">
                      {patient.trust_stability === "stable" 
                        ? "This result looks consistent and reliable."
                        : patient.trust_stability === "borderline"
                        ? "This result is fairly consistent, but retesting could help confirm it."
                        : "This result could change if retested. We recommend confirming with your doctor."}
                    </p>
                  </div>
                )}

                {/* Boundary Proximity */}
                {patient.boundary_near ? (
                  <div className="mt-4 rounded-xl border bg-amber-50 dark:bg-amber-900/30 p-4 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚠</span>
                      <p className="text-sm font-semibold">Near risk-category boundary</p>
                    </div>
                    <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                      {userRole === "doctor"
                        ? (patient.boundary_message || "Result is near a clinical threshold. Classification could shift due to natural variations.")
                        : "Your result is close to a different risk category — small changes could shift the outcome. Worth confirming with a follow-up test."}
                    </p>
                  </div>

                ) : (
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <svg className="h-4 w-4 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Clear classification margin
                  </div>
                )}

                {/* top factors */}
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Top contributing factors</h3>
                  <ol className="mt-3 flex flex-col gap-2">
                    {patient.top_factors.map((factor, index) => (
                      <li
                        key={factor.feature}
                        className="flex items-start gap-3 rounded-lg bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-700 dark:text-slate-200"
                      >
                        <span className="font-semibold text-sky-700 dark:text-sky-400">{index + 1}.</span>
                        <span>{factorSentence(factor)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Clinical Outcome (Doctor Only) */}
              {userRole === "doctor" && (
                <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm sm:p-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Clinical Outcome</h2>
                    {patient.clinical_outcome && (
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold border ${
                        patient.clinical_outcome === "confirmed_ckd" ? "bg-red-50 text-red-700 dark:text-red-400 border-red-200" :
                        patient.clinical_outcome === "confirmed_not_ckd" ? "bg-emerald-50 text-emerald-700 dark:text-emerald-400 border-emerald-200" :
                        "bg-amber-50 text-amber-700 dark:text-amber-400 border-amber-200"
                      }`}>
                        {patient.clinical_outcome === "confirmed_ckd" ? "Confirmed CKD" : patient.clinical_outcome === "confirmed_not_ckd" ? "Confirmed Not CKD" : "Pending"}
                      </span>
                    )}
                  </div>
                  
                  {outcomeError && (
                    <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-800 dark:text-red-300">
                      {outcomeError}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <button
                      onClick={() => handleUpdateOutcome("confirmed_ckd")}
                      disabled={outcomeSaving}
                      className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition ${patient.clinical_outcome === "confirmed_ckd" ? "bg-red-600 text-white border-red-600" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"} disabled:opacity-50`}
                    >
                      Confirm CKD
                    </button>
                    <button
                      onClick={() => handleUpdateOutcome("confirmed_not_ckd")}
                      disabled={outcomeSaving}
                      className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition ${patient.clinical_outcome === "confirmed_not_ckd" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"} disabled:opacity-50`}
                    >
                      Confirm Not CKD
                    </button>
                    <button
                      onClick={() => handleUpdateOutcome("pending")}
                      disabled={outcomeSaving}
                      className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition ${patient.clinical_outcome === "pending" ? "bg-amber-500 text-white border-amber-500" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"} disabled:opacity-50`}
                    >
                      Mark Pending
                    </button>
                  </div>
                  
                  <textarea
                    value={outcomeNotes}
                    onChange={(e) => setOutcomeNotes(e.target.value)}
                    placeholder="Optional clinical notes (save by clicking an outcome button above)..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-1 focus:ring-sky-500 dark:focus:ring-sky-400"
                    rows={2}
                  />
                </div>
              )}

              {/* raw inputs card */}
              <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm sm:p-8">
                <h2 className="mb-6 text-lg font-semibold text-sky-800">Submitted Values</h2>
                {INPUT_SECTIONS.map((section) => (
                  <div key={section.title} className="mb-6 last:mb-0">
                    <h3 className="mb-3 border-b border-slate-100 dark:border-slate-800 pb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {section.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 md:grid-cols-4">
                      {section.fields.map((field) => {
                        const val = patient.inputs?.[field.key];
                        return (
                          <div key={field.key} className="flex flex-col">
                            <span className="text-xs text-slate-500 dark:text-slate-400">{field.label}</span>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              {formatValue(val)}
                              {field.unit && val != null && val !== "" ? (
                                <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">{field.unit}</span>
                              ) : null}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Panel */}
              <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm sm:p-8">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Ask about this result</h2>
                <div className="mt-4 flex h-80 flex-col gap-3 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                  {messages.length === 0 ? (
                    <p className="m-auto text-sm text-slate-400 dark:text-slate-500">No messages yet. Ask a question below!</p>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "self-end bg-sky-600 dark:bg-sky-700 text-white"
                            : "self-start bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
                        }`}
                      >
                        {msg.role === "user" ? (
                          msg.text
                        ) : (
                          <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                            <ReactMarkdown>
                              {msg.text}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="max-w-[85%] self-start rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm text-slate-500 dark:text-slate-400 shadow-sm">
                      Thinking…
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendChat} className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="E.g. What does specific gravity mean?"
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm text-slate-800 dark:text-slate-200 shadow-sm outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-1 focus:ring-sky-500 dark:focus:ring-sky-400 disabled:opacity-50"
                    disabled={chatLoading}
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="rounded-lg bg-sky-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
                {chatError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{chatError}</p>}
                
                <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
                  This assistant explains your screening result and provides general CKD education. It cannot diagnose or recommend treatment.
                </p>
              </div>
            </>
          );
        })()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function PatientDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <AuthGuard>
      <PatientDetailContent params={params} />
    </AuthGuard>
  );
}
