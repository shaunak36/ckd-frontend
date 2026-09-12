"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
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
      className="w-full border-y border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium leading-relaxed text-amber-950"
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
    "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200";

  return (
    <label htmlFor={id} className="flex flex-col">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        {isAutoFilled && (
          <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-700">
            Auto-filled
          </span>
        )}
      </div>
      {field.hint ? <span className="text-xs text-slate-500">{field.hint}</span> : null}
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
  const [screenMode, setScreenMode] = useState<"quick" | "detailed">("detailed");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !cancelled) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
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

  return (
    <div className="flex min-h-screen flex-col bg-sky-50">
      <DisclaimerBanner />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Clinical Screening Tool
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Chronic Kidney Disease risk estimate
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Enter available lab values and medical history. The estimate is generated by a
              local model and is intended for education only.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            {userRole === "doctor" ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-sky-700 shadow-sm transition hover:bg-sky-50"
              >
                Dashboard →
              </Link>
            ) : (
              <Link
                href="/my-results"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-sky-700 shadow-sm transition hover:bg-sky-50"
              >
                My Results →
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </div>

        {/* Report Upload Section */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-sky-400 hover:bg-sky-50">
            <input 
              type="file" 
              className="hidden" 
              accept=".pdf,.png,.jpg,.jpeg" 
              onChange={handleFileUpload} 
              disabled={uploading} 
            />
            {uploading ? (
              <p className="text-sm font-semibold text-slate-700">Extracting data…</p>
            ) : (
              <>
                <svg className="mb-3 h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-semibold text-slate-900">Upload a lab report (optional)</p>
                <p className="mt-1 text-xs text-slate-500">We'll extract what we can — you'll review and confirm before submitting.</p>
                <p className="mt-2 text-xs font-medium text-slate-400">Accepts PDF, PNG, JPG</p>
              </>
            )}
          </label>
          
          {uploadError && (
             <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 border border-red-100">
               {uploadError}
             </div>
          )}
          {uploadSuccessNote && (
             <div className="mt-4 flex items-start gap-2 rounded-lg bg-sky-50 p-3 text-sm text-sky-800 border border-sky-100">
               <svg className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               <p>{uploadSuccessNote}</p>
             </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          {/* Toggle */}
          <div className="mb-8 flex flex-col gap-2">
            <div className="flex w-full rounded-lg border border-slate-200 bg-slate-50 p-1 sm:w-fit">
              <button
                type="button"
                onClick={() => setScreenMode("quick")}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition sm:flex-none ${
                  screenMode === "quick" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Quick Screen (8 values)
              </button>
              <button
                type="button"
                onClick={() => setScreenMode("detailed")}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition sm:flex-none ${
                  screenMode === "detailed" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Detailed Screen (24 values)
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Quick Screen uses the 8 most predictive values and performs nearly as well as the full assessment. Use Detailed Screen when you have complete lab results.
            </p>
          </div>

          {/* Patient name — outside SECTIONS since it's not a clinical numeric/categorical field */}
          <div className="mb-8">
            <label htmlFor="field-patientName" className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">Patient name (optional)</span>
                {autoFilledFields.has("patientName") && (
                  <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-700">
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
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
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
                <h2 className="mb-4 border-b border-slate-100 pb-2 text-lg font-semibold text-sky-800">
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
            <p className="text-xs text-slate-500">
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
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {result && band && trust ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
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

            {/* Explanation Confidence card — the trust/consistency layer */}
            <div className={`mt-6 rounded-xl border p-4 ${trust.badgeClass}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{trust.icon}</span>
                <p className="text-sm font-semibold">Explanation Confidence: {trust.label}</p>
              </div>
              <p className="mt-1 text-sm">{result.trust.message}</p>
              <p className="mt-1 text-xs opacity-70">
                Swing under 5% simulated lab noise: {(result.trust.swing * 100).toFixed(1)} percentage points
              </p>
            </div>

            {/* Boundary Proximity card */}
            {result.boundary?.near_boundary && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚠</span>
                  <p className="text-sm font-semibold">Near risk-category boundary</p>
                </div>
                <p className="mt-1 text-sm">{result.boundary.message}</p>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-800">Top contributing factors</h3>
              <ol className="mt-3 flex flex-col gap-2">
                {result.top_factors.map((factor, index) => (
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
        ) : null}
      </main>

      <DisclaimerBanner />
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
