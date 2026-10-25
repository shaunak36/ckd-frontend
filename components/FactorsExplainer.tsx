"use client";

import { useMemo, useState } from "react";
import { REFERENCE_RANGES, type ReferenceRange } from "@/lib/referenceRanges";

export type TopFactor = {
  feature: string;
  direction: string;
  impact: number;
};

export type HistoryPoint = {
  date: string;
  risk_score: number;
};

type FactorsExplainerProps = {
  topFactors: TopFactor[];
  inputs: Record<string, string | number>;
  percent: number;
  riskLabel: string;
  trustStability: string;
  trustSwing: number;
  trustMessage: string;
  boundaryNear: boolean;
  boundaryMessage?: string;
  isDoctor?: boolean;
  history?: HistoryPoint[] | null;
  patientName?: string;
  askWhyTargetId?: string;
  onAskWhy?: () => void;
};

const FEATURE_LABELS: Record<string, string> = {
  age: "Age", bp: "Blood pressure", sg: "Specific gravity", al: "Albumin",
  su: "Sugar", rbc: "Red blood cells", pc: "Pus cells", pcc: "Pus cell clumps",
  ba: "Bacteria", bgr: "Blood glucose", bu: "Blood urea", sc: "Serum creatinine",
  sod: "Sodium", pot: "Potassium", hemo: "Hemoglobin", pcv: "Packed cell volume",
  wbcc: "White blood cell count", rbcc: "Red blood cell count", htn: "Hypertension",
  dm: "Diabetes mellitus", cad: "Coronary artery disease", appet: "Appetite",
  pe: "Pedal edema", ane: "Anemia",
};

function isRaising(direction: string) {
  return direction.toLowerCase().includes("increase");
}

function formatValue(value: string | number) {
  return typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 3 }) : value;
}

function rangeText(range: ReferenceRange) {
  if (range.typical) return `Typical: ${range.typical}`;
  if (range.min !== undefined && range.max !== undefined) {
    return `typical ${range.min}-${range.max}${range.unit ? ` ${range.unit}` : ""}`;
  }
  return null;
}

function rangeStatus(value: string | number | undefined, range: ReferenceRange) {
  if (range.typical === "none") {
    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) && number > 0 ? "Above typical" : "Within typical range";
  }
  if (range.min === undefined || range.max === undefined) return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return null;
  if (number < range.min) return "Lower than typical";
  if (number > range.max) return "Higher than typical";
  return "Within typical range";
}

function statusClass(status: string | null) {
  if (status === "Higher than typical" || status === "Above typical") return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300";
  if (status === "Lower than typical") return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300";
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
}

function TrustAccordion({
  stability, swing, message, boundaryNear, boundaryMessage, isDoctor,
}: {
  stability: string;
  swing: number;
  message: string;
  boundaryNear: boolean;
  boundaryMessage?: string;
  isDoctor?: boolean;
}) {
  const stable = stability === "stable";
  const borderline = stability === "borderline";
  const tone = stable
    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
    : borderline
    ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
    : "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30";
  const patientCopy = stable
    ? "This result stayed consistent when we tested it with small changes to the inputs."
    : borderline
    ? "This result is fairly consistent, but retesting could help confirm it."
    : "Why we suggest confirming: this AI's result is sensitive. Small changes in lab values, for example a slightly different reading on a retest, could shift the risk number noticeably. That is why a doctor's confirmation matters.";
  const [open, setOpen] = useState(!!isDoctor);

  return (
    <div className={`mt-5 rounded-xl border ${tone}`}>
      <button type="button" onClick={() => setOpen(value => !value)} className="flex w-full items-center justify-between gap-4 p-4 text-left">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">How reliable is this explanation?</span>
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          {stable ? "Stable" : borderline ? "Borderline" : "Unstable"}
          <span aria-hidden>{open ? "▴" : "▾"}</span>
        </span>
      </button>
      {open && (
        <div className="border-t border-inherit px-4 pb-4 pt-3 text-sm text-slate-700 dark:text-slate-200">
          <p>{isDoctor ? message : patientCopy}</p>
          {isDoctor && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Score swing under 5% lab noise: {(swing * 100).toFixed(1)} percentage points</p>}
          <div className="mt-3 flex items-start gap-2">
            <span className={boundaryNear ? "text-amber-600" : "text-emerald-600"}>{boundaryNear ? "!" : "✓"}</span>
            <p className="text-xs">{boundaryNear ? (isDoctor ? boundaryMessage || "Result is near a risk-category threshold." : "Your result is close to a different risk category — small changes could shift the outcome.") : "Clear classification margin — result is not near a threshold boundary."}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FactorsExplainer({
  topFactors, inputs, percent, trustStability, trustSwing, trustMessage,
  boundaryNear, boundaryMessage, isDoctor = false, askWhyTargetId, onAskWhy,
}: FactorsExplainerProps) {
  const factors = useMemo(() => [...(topFactors || [])].filter(f => Number.isFinite(f.impact) && f.impact > 0).sort((a, b) => b.impact - a.impact).slice(0, 6), [topFactors]);
  const total = factors.reduce((sum, factor) => sum + Math.abs(factor.impact), 0) || 1;

  if (factors.length === 0) return null;

  return (
    <section className="mt-8 rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-sm dark:border-sky-900 dark:bg-sky-950/20 sm:p-7" aria-labelledby="explainable-ai-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Explainable AI</p>
          <h2 id="explainable-ai-title" className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">Why is your risk {percent.toFixed(1)}%?</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            if (onAskWhy) {
              onAskWhy();
              return;
            }
            document.getElementById(askWhyTargetId || "explainable-ai-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="shrink-0 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
        >
          Ask why
        </button>
      </div>

      <div className="mt-6 space-y-5">
        {factors.map((factor) => {
          const raising = isRaising(factor.direction);
          const label = FEATURE_LABELS[factor.feature] || factor.feature;
          const value = inputs?.[factor.feature];
          const range = REFERENCE_RANGES[factor.feature];
          const rangeLabel = range && rangeText(range);
          const status = range ? rangeStatus(value, range) : null;
          const share = Math.round((Math.abs(factor.impact) / total) * 100);
          return (
            <div key={factor.feature}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-800 dark:text-slate-100">{label}</span>
                <span className={`font-bold tabular-nums ${raising ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>{share}%</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white dark:bg-slate-800">
                <div className={`h-full rounded-full transition-all ${raising ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${Math.max(3, share)}%` }} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                <span>{label}: <strong>{value === undefined || value === "" ? "Not provided" : formatValue(value)}</strong>{range?.unit && value !== undefined && value !== "" ? ` ${range.unit}` : ""}</span>
                {rangeLabel && <span className="text-slate-500 dark:text-slate-400">({rangeLabel})</span>}
                {status && <span className={`rounded-full border px-2 py-0.5 font-semibold ${statusClass(status)}`}>{status}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">These are the factors that influenced the AI&apos;s result the most.</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Typical ranges are general references and may vary by lab, age, and sex.</p>
      <TrustAccordion stability={trustStability} swing={trustSwing} message={trustMessage} boundaryNear={boundaryNear} boundaryMessage={boundaryMessage} isDoctor={isDoctor} />
    </section>
  );
}
