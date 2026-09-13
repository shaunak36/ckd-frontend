"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/predict`;

const DISCLAIMER =
  "This tool provides an educational risk estimate only. It is not a medical diagnosis. Consult a qualified healthcare professional for any health concerns.";

type NumericKey =
  | "age" | "bp" | "sg" | "al" | "su" | "bgr" | "bu" | "sc"
  | "sod" | "pot" | "hemo" | "pcv" | "wbcc" | "rbcc";

type CategoricalKey =
  | "rbc" | "pc" | "pcc" | "ba" | "htn" | "dm" | "cad" | "appet" | "pe" | "ane";

type FormState = Record<NumericKey | CategoricalKey, string> & { patientName: string };

type TopFactor = {
  feature: string;
  direction: string;
  impact: number;
};

type TrustResult = {
  swing: number;
  stability: "stable" | "borderline" | "unstable" | string;
  message: string;
};

type PredictResponse = {
  risk_score: number;
  risk_percentage: string;
  top_factors: TopFactor[];
  trust: TrustResult;
  boundary?: {
    near_boundary: boolean;
    distance_to_boundary: number;
    message: string;
  };
  patient_summary?: string;
};

type FieldDef = {
  key: NumericKey | CategoricalKey;
  label: string;
  hint?: string;
  type: "number" | "select";
  options?: { value: string; label: string }[];
  step?: string;
};

const FEATURE_LABELS: Record<string, string> = {
  age: "Age", bp: "Blood pressure", sg: "Specific gravity", al: "Albumin",
  su: "Sugar", rbc: "Red blood cells", pc: "Pus cells", pcc: "Pus cell clumps",
  ba: "Bacteria", bgr: "Blood glucose (random)", bu: "Blood urea",
  sc: "Serum creatinine", sod: "Sodium", pot: "Potassium", hemo: "Hemoglobin",
  pcv: "Packed cell volume", wbcc: "White blood cell count",
  rbcc: "Red blood cell count", htn: "Hypertension", dm: "Diabetes mellitus",
  cad: "Coronary artery disease", appet: "Appetite", pe: "Pedal edema", ane: "Anemia",
};

const NORMAL_ABNORMAL = [
  { value: "normal", label: "normal" },
  { value: "abnormal", label: "abnormal" },
];
const PRESENT_NOTPRESENT = [
  { value: "present", label: "present" },
  { value: "notpresent", label: "notpresent" },
];
const YES_NO = [
  { value: "yes", label: "yes" },
  { value: "no", label: "no" },
];
const APPETITE = [
  { value: "good", label: "good" },
  { value: "poor", label: "poor" },
];

const SECTIONS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Demographics",
    fields: [
      { key: "age", label: "Age", hint: "years", type: "number" },
      { key: "bp", label: "Blood pressure (bp)", hint: "mmHg", type: "number" },
    ],
  },
  {
    title: "Urine Tests",
    fields: [
      { key: "sg", label: "Specific gravity (sg)", hint: "e.g. 1.015", type: "number", step: "0.001" },
      { key: "al", label: "Albumin (al)", hint: "0–5", type: "number" },
      { key: "su", label: "Sugar (su)", hint: "0–5", type: "number" },
      { key: "rbc", label: "Red blood cells (rbc)", type: "select", options: NORMAL_ABNORMAL },
      { key: "pc", label: "Pus cells (pc)", type: "select", options: NORMAL_ABNORMAL },
      { key: "pcc", label: "Pus cell clumps (pcc)", type: "select", options: PRESENT_NOTPRESENT },
      { key: "ba", label: "Bacteria (ba)", type: "select", options: PRESENT_NOTPRESENT },
    ],
  },
  {
    title: "Blood Tests",
    fields: [
      { key: "bgr", label: "Blood glucose random (bgr)", hint: "mg/dL", type: "number" },
      { key: "bu", label: "Blood urea (bu)", hint: "mg/dL", type: "number" },
      { key: "sc", label: "Serum creatinine (sc)", hint: "mg/dL", type: "number", step: "0.01" },
      { key: "sod", label: "Sodium (sod)", hint: "mEq/L", type: "number", step: "0.1" },
      { key: "pot", label: "Potassium (pot)", hint: "mEq/L", type: "number", step: "0.1" },
      { key: "hemo", label: "Hemoglobin (hemo)", hint: "g/dL", type: "number", step: "0.1" },
      { key: "pcv", label: "Packed cell volume (pcv)", hint: "%", type: "number" },
      { key: "wbcc", label: "White blood cell count (wbcc)", hint: "cells/cumm", type: "number" },
      { key: "rbcc", label: "Red blood cell count (rbcc)", hint: "millions/cmm", type: "number", step: "0.1" },
    ],
  },
  {
    title: "Medical History",
    fields: [
      { key: "htn", label: "Hypertension (htn)", type: "select", options: YES_NO },
      { key: "dm", label: "Diabetes mellitus (dm)", type: "select", options: YES_NO },
      { key: "cad", label: "Coronary artery disease (cad)", type: "select", options: YES_NO },
      { key: "appet", label: "Appetite (appet)", type: "select", options: APPETITE },
      { key: "pe", label: "Pedal edema (pe)", type: "select", options: YES_NO },
      { key: "ane", label: "Anemia (ane)", type: "select", options: YES_NO },
    ],
  },
];

const INITIAL_FORM: FormState = {
  patientName: "",
  age: "", bp: "", sg: "", al: "", su: "", rbc: "", pc: "", pcc: "", ba: "",
  bgr: "", bu: "", sc: "", sod: "", pot: "", hemo: "", pcv: "", wbcc: "",
  rbcc: "", htn: "", dm: "", cad: "", appet: "", pe: "", ane: "",
};

function parseRiskPercent(result: PredictResponse): number {
  if (typeof result.risk_score === "number" && Number.isFinite(result.risk_score)) {
    return result.risk_score * 100;
  }
  const parsed = Number.parseFloat(String(result.risk_percentage).replace("%", ""));
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
  if (direction.includes("increase")) return `${name} is increasing your risk`;
  if (direction.includes("decrease")) return `${name} is decreasing your risk`;
  return `${name} has little effect on this estimate`;
}

function DisclaimerBanner() {
  return (
    <div
      role="note"
      className="w-full border-y border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-4 py-3 text-center text-sm font-medium leading-relaxed text-amber-900 dark:text-amber-200"
    >
      {DISCLAIMER}
    </div>
  );
}

function FieldControl({
  field,
  value,
  isAutoFilled,
  onChange,
}: {
  field: FieldDef;
  value: string;
  isAutoFilled?: boolean;
  onChange: (key: FieldDef["key"], value: string) => void;
}) {
  const id = `field-${field.key}`;
  const shared =
    "mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm outline-none transition focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-900/50";

  return (
    <label htmlFor={id} className="flex flex-col">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{field.label}</span>
        {isAutoFilled && (
          <span className="rounded bg-sky-100 dark:bg-sky-900/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
            Auto-filled
          </span>
        )}
      </div>
      {field.hint ? <span className="text-xs text-slate-500 dark:text-slate-400">{field.hint}</span> : null}
      {field.type === "number" ? (
        <input
          id={id}
          name={field.key}
          type="number"
          inputMode="decimal"
          step={field.step ?? "any"}
          required
          value={value}
          onChange={(event) => onChange(field.key, event.target.value)}
          className={shared}
        />
      ) : (
        <select
          id={id}
          name={field.key}
          required
          value={value}
          onChange={(event) => onChange(field.key, event.target.value)}
          className={shared}
        >
          <option value="" disabled>
            Select…
          </option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </label>
  );
}

function ScreeningContent() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessNote, setUploadSuccessNote] = useState<string | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [screenMode, setScreenMode] = useState<"quick" | "detailed">("detailed");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !cancelled) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .single();
        if (profile?.role && !cancelled) {
          setUserRole(profile.role);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccessNote(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extract-report`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to process the report");
      }

      const data = await res.json();
      const extracted = data.extracted_values || data;
      const note = data.extraction_note || "Values extracted from your report — please review before submitting.";
      
      const newForm = { ...form };
      const filled = new Set<string>();

      for (const [k, v] of Object.entries(extracted)) {
        let targetKey = k;
        if (k === "patient_name") targetKey = "patientName";

        if (v !== null && v !== undefined && targetKey in newForm) {
          newForm[targetKey as keyof FormState] = String(v);
          filled.add(targetKey);
        }
      }

      setForm(newForm);
      setAutoFilledFields(filled);
      setUploadSuccessNote(note);
    } catch (err) {
      setUploadError("Couldn't read that file — you can still fill the form manually.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handleChange(key: FieldDef["key"], value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (autoFilledFields.has(key)) {
      setAutoFilledFields((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const numericKeys: NumericKey[] = [
      "age", "bp", "sg", "al", "su", "bgr", "bu", "sc",
      "sod", "pot", "hemo", "pcv", "wbcc", "rbcc",
    ];

    const { data: { user } } = await supabase.auth.getUser();

    const QUICK_KEYS = new Set(["hemo", "sg", "al", "htn", "sc", "bu", "bgr", "rbcc"]);

    const payload: Record<string, any> = {};
    if (screenMode === "quick") {
      for (const [k, v] of Object.entries(form)) {
        if (QUICK_KEYS.has(k)) {
          payload[k] = numericKeys.includes(k as NumericKey) ? Number.parseFloat(v as string) : v;
        }
      }
    } else {
      for (const [k, v] of Object.entries(form)) {
        if (k !== "patientName") {
          payload[k] = numericKeys.includes(k as NumericKey) ? Number.parseFloat(v as string) : v;
        }
      }
    }

    payload.patient_name = form.patientName || "Unnamed";
    payload.created_by = user?.id;

    const endpoint = screenMode === "quick" ? `${process.env.NEXT_PUBLIC_API_URL}/predict-quick` : API_URL;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || `Request failed (${response.status})`);
      }

      const data: PredictResponse = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not reach the prediction service: ${err.message}`
          : "Something went wrong. Please check that the backend is running and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const percent = result ? parseRiskPercent(result) : 0;
  const band = result ? riskBand(percent) : null;
  const trust = result ? trustStyles(result.trust.stability) : null;

  
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
              <Link href="/screening" className="flex items-center gap-3 rounded-md bg-sky-50 dark:bg-sky-900/30 px-3 py-2 text-sm font-medium text-sky-700 dark:text-sky-400">
                <svg className="h-5 w-5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
              <Link href="/screening" className="flex items-center gap-3 rounded-md bg-sky-50 dark:bg-sky-900/30 px-3 py-2 text-sm font-medium text-sky-700 dark:text-sky-400">
                <svg className="h-5 w-5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
        <DisclaimerBanner />
        <main className="flex-1 p-8">
          <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
              Clinical Screening Tool
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Chronic Kidney Disease risk estimate
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Enter available lab values and medical history. The estimate is generated by a
              local model and is intended for education only.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            {userRole === "doctor" ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-sky-700 dark:text-sky-400 shadow-sm transition hover:bg-sky-50 dark:hover:bg-slate-800"
              >
                Dashboard →
              </Link>
            ) : (
              <Link
                href="/my-results"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-sky-700 dark:text-sky-400 shadow-sm transition hover:bg-sky-50 dark:hover:bg-slate-800"
              >
                My Results →
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Report Upload Section */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm sm:p-8">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-6 py-8 text-center transition hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800">
            <input 
              type="file" 
              className="hidden" 
              accept=".pdf,.png,.jpg,.jpeg" 
              onChange={handleFileUpload} 
              disabled={uploading} 
            />
            {uploading ? (
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Extracting data…</p>
            ) : (
              <>
                <svg className="mb-3 h-8 w-8 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Upload a lab report (optional)</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">We'll extract what we can — you'll review and confirm before submitting.</p>
                <p className="mt-2 text-xs font-medium text-slate-400 dark:text-slate-500">Accepts PDF, PNG, JPG</p>
              </>
            )}
          </label>
          
          {uploadError && (
             <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-800 dark:text-red-300 border border-red-100">
               {uploadError}
             </div>
          )}
          {uploadSuccessNote && (
             <div className="mt-4 flex items-start gap-2 rounded-lg bg-sky-50 dark:bg-sky-900/30 p-3 text-sm text-sky-800 border border-sky-100">
               <svg className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               <p>{uploadSuccessNote}</p>
             </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm sm:p-8"
        >
          {/* Toggle */}
          <div className="mb-8 flex flex-col gap-2">
            <div className="flex w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1 sm:w-fit">
              <button
                type="button"
                onClick={() => setScreenMode("quick")}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition sm:flex-none ${
                  screenMode === "quick" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                Quick Screen (8 values)
              </button>
              <button
                type="button"
                onClick={() => setScreenMode("detailed")}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition sm:flex-none ${
                  screenMode === "detailed" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                Detailed Screen (24 values)
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quick Screen uses the 8 most predictive values and performs nearly as well as the full assessment. Use Detailed Screen when you have complete lab results.
            </p>
          </div>

          {/* Patient name — outside SECTIONS since it's not a clinical numeric/categorical field */}
          <div className="mb-8">
            <label htmlFor="field-patientName" className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Patient name (optional)</span>
                {autoFilledFields.has("patientName") && (
                  <span className="rounded bg-sky-100 dark:bg-sky-900/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                    Auto-filled
                  </span>
                )}
              </div>
              <input
                id="field-patientName"
                name="patientName"
                type="text"
                value={form.patientName}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, patientName: e.target.value }));
                  if (autoFilledFields.has("patientName")) {
                    setAutoFilledFields((prev) => {
                      const next = new Set(prev);
                      next.delete("patientName");
                      return next;
                    });
                  }
                }}
                className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm outline-none transition focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-900/50"
                placeholder="e.g. John Doe"
              />
            </label>
          </div>

          {SECTIONS.map((section) => {
            const QUICK_KEYS = new Set(["hemo", "sg", "al", "htn", "sc", "bu", "bgr", "rbcc"]);
            const fields = screenMode === "quick"
              ? section.fields.filter((f) => QUICK_KEYS.has(f.key))
              : section.fields;

            if (fields.length === 0) return null;

            return (
              <div key={section.title} className="mb-8 last:mb-0">
                <h2 className="mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 text-lg font-semibold text-sky-800">
                  {section.title}
                </h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  {fields.map((field) => (
                    <FieldControl
                      key={field.key}
                      field={field}
                      value={form[field.key]}
                      isAutoFilled={autoFilledFields.has(field.key)}
                      onChange={handleChange}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {screenMode === "quick" ? "All 8 fields are required." : "All 24 fields are required for a complete estimate."}
            </p>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-sky-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Estimating…" : "Estimate risk"}
            </button>
          </div>
        </form>

        {error ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-5 text-sm text-red-800 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {result && band && trust ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm sm:p-8">
            {result.patient_summary && (
              <div className="mb-6 rounded-xl border border-sky-100 bg-sky-50/50 p-5 shadow-sm">
                <div className="flex gap-4">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-[15px] font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                    {result.patient_summary}
                  </p>
                </div>
              </div>
            )}
            
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

            {/* Explanation Confidence card - the trust/consistency layer */}
            <div className={`mt-6 rounded-xl border p-4 ${trust.badgeClass}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{trust.icon}</span>
                <p className="text-sm font-semibold">Explanation Confidence</p>
              </div>
              <p className="mt-1 text-sm">{trust.label}</p>
            </div>

            {/* Boundary Proximity */}
            {result.boundary?.near_boundary && (
              <div className="mt-4 rounded-xl border bg-amber-50 dark:bg-amber-900/30 p-4 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚠</span>
                  <p className="text-sm font-semibold">Near risk-category boundary</p>
                </div>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                  Your result is close to a different risk category — small changes could shift the outcome. Worth confirming with a follow-up test.
                </p>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Top contributing factors</h3>
              <ol className="mt-3 flex flex-col gap-2">
                {result.top_factors.map((factor, index) => (
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
        ) : null}
          </div>
        </main>
        <DisclaimerBanner />
      </div>
    </div>
  );
}

export default function ScreeningPage() {
  return (
    <AuthGuard>
      <ScreeningContent />
    </AuthGuard>
  );
}
