"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import ReactMarkdown from "react-markdown";

const API_URL = "http://127.0.0.1:8000/patients";

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

  async function handleSendChat(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || !patient) return;

    const question = chatInput.trim();
    setChatInput("");
    setChatError(null);
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setChatLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
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
          const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
          if (profile) setUserRole(profile.role);
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

  return (
    <div className="flex min-h-screen flex-col bg-sky-50">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10 sm:px-8">
        {/* header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Clinical Screening Tool
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Patient Record
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`http://127.0.0.1:8000/patients/${id}/report-pdf`}
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-sky-700 shadow-sm transition hover:bg-sky-50"
            >
              ← Back to dashboard
            </Link>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </div>

        {/* loading */}
        {loading && (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
            <p className="text-sm text-slate-500">Loading patient record…</p>
          </div>
        )}

        {/* error */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* not found */}
        {notFound && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-800">Patient not found</p>
            <p className="mt-2 text-sm text-slate-500">
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
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h2 className="text-xl font-bold text-slate-900">
                    {patient.patient_name || "Unnamed"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Screened {formatDate(patient.created_at)}
                  </p>
                </div>
              </div>

              {/* risk result card — mirrors main page layout */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                {/* large percentage */}
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${band.barClass}`}
                      style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-slate-400">
                    <span>0%</span>
                    <span>30%</span>
                    <span>70%</span>
                    <span>100%</span>
                  </div>
                  <p className="mt-1 text-center text-xs text-slate-400">
                    Green under 30%, yellow 30–70%, red over 70%.
                  </p>
                </div>

                {/* trust card */}
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

                {/* Boundary Proximity */}
                {patient.boundary_near ? (
                  <div className="mt-4 rounded-xl border bg-amber-50 p-4 text-amber-900 border-amber-200">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚠</span>
                      <p className="text-sm font-semibold">Near risk-category boundary</p>
                    </div>
                    <p className="mt-1 text-sm text-amber-800">
                      {patient.boundary_message || "Result is near a clinical threshold. Classification could shift due to natural variations."}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
                    <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Clear classification margin
                  </div>
                )}

                {/* top factors */}
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-slate-800">Top contributing factors</h3>
                  <ol className="mt-3 flex flex-col gap-2">
                    {patient.top_factors.map((factor, index) => (
                      <li
                        key={factor.feature}
                        className="flex items-start gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700"
                      >
                        <span className="font-semibold text-sky-700">{index + 1}.</span>
                        <span>{factorSentence(factor)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Clinical Outcome (Doctor Only) */}
              {userRole === "doctor" && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">Clinical Outcome</h2>
                    {patient.clinical_outcome && (
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold border ${
                        patient.clinical_outcome === "confirmed_ckd" ? "bg-red-50 text-red-700 border-red-200" :
                        patient.clinical_outcome === "confirmed_not_ckd" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {patient.clinical_outcome === "confirmed_ckd" ? "Confirmed CKD" : patient.clinical_outcome === "confirmed_not_ckd" ? "Confirmed Not CKD" : "Pending"}
                      </span>
                    )}
                  </div>
                  
                  {outcomeError && (
                    <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
                      {outcomeError}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <button
                      onClick={() => handleUpdateOutcome("confirmed_ckd")}
                      disabled={outcomeSaving}
                      className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition ${patient.clinical_outcome === "confirmed_ckd" ? "bg-red-600 text-white border-red-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"} disabled:opacity-50`}
                    >
                      Confirm CKD
                    </button>
                    <button
                      onClick={() => handleUpdateOutcome("confirmed_not_ckd")}
                      disabled={outcomeSaving}
                      className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition ${patient.clinical_outcome === "confirmed_not_ckd" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"} disabled:opacity-50`}
                    >
                      Confirm Not CKD
                    </button>
                    <button
                      onClick={() => handleUpdateOutcome("pending")}
                      disabled={outcomeSaving}
                      className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition ${patient.clinical_outcome === "pending" ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"} disabled:opacity-50`}
                    >
                      Mark Pending
                    </button>
                  </div>
                  
                  <textarea
                    value={outcomeNotes}
                    onChange={(e) => setOutcomeNotes(e.target.value)}
                    placeholder="Optional clinical notes (save by clicking an outcome button above)..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    rows={2}
                  />
                </div>
              )}

              {/* raw inputs card */}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="mb-6 text-lg font-semibold text-sky-800">Submitted Values</h2>
                {INPUT_SECTIONS.map((section) => (
                  <div key={section.title} className="mb-6 last:mb-0">
                    <h3 className="mb-3 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-600">
                      {section.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 md:grid-cols-4">
                      {section.fields.map((field) => {
                        const val = patient.inputs?.[field.key];
                        return (
                          <div key={field.key} className="flex flex-col">
                            <span className="text-xs text-slate-500">{field.label}</span>
                            <span className="text-sm font-medium text-slate-800">
                              {formatValue(val)}
                              {field.unit && val != null && val !== "" ? (
                                <span className="ml-1 text-xs font-normal text-slate-400">{field.unit}</span>
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
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-lg font-semibold text-slate-900">Ask about this result</h2>
                <div className="mt-4 flex h-80 flex-col gap-3 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-4">
                  {messages.length === 0 ? (
                    <p className="m-auto text-sm text-slate-400">No messages yet. Ask a question below!</p>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "self-end bg-sky-600 text-white"
                            : "self-start bg-white border border-slate-200 shadow-sm"
                        }`}
                      >
                        {msg.role === "user" ? (
                          msg.text
                        ) : (
                          <div className="prose prose-sm prose-slate max-w-none">
                            <ReactMarkdown>
                              {msg.text}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="max-w-[85%] self-start rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">
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
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
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
                {chatError && <p className="mt-2 text-xs text-red-600">{chatError}</p>}
                
                <p className="mt-4 text-center text-xs text-slate-500">
                  This assistant explains your screening result and provides general CKD education. It cannot diagnose or recommend treatment.
                </p>
              </div>
            </>
          );
        })()}
      </main>
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
