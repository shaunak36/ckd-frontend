"use client";

/**
 * FactorsExplainer — patient-friendly CKD risk explainability panel
 *
 * DATA AUDIT (2026-09-27):
 * ─────────────────────────────────────────────────────────────────
 * AVAILABLE (real, wired in):
 *   • top_factors[]:  { feature: string, direction: "increases risk"|"decreases risk"|"no change", impact: float }
 *                     `impact` = |SHAP value|, used for tug-of-war magnitude
 *   • inputs{}:       Record<string, string|number>  — raw submitted lab values
 *   • trust_stability / trust_swing / trust_message
 *   • boundary_near / boundary_message
 *   • risk_score / risk_percentage (percent prop passed in)
 *   • Screening history: derived from GET /patients?created_by= (same patient_name
 *     across multiple assessments). Parent page fetches and passes as `history` prop.
 *
 * NOT AVAILABLE (gracefully hidden when absent):
 *   • `history` prop: trend chart is hidden if null/empty. No fake numbers.
 *   • Age/sex population baseline: static lookup table below, marked TODO.
 *     Shows baseline line on trend chart only if age is available in inputs.
 */

import React, { useState } from "react";

/* ──────────────────────────────── Types ─────────────────────────────────── */

export type TopFactor = {
  feature: string;
  direction: string; // "increases risk" | "decreases risk" | "no change"
  impact: number;    // |SHAP value| — absolute magnitude
};

export type HistoryPoint = {
  date: string;        // ISO string
  risk_score: number;  // 0–1
};

export type FactorsExplainerProps = {
  topFactors: TopFactor[];
  inputs: Record<string, string | number>;
  percent: number;          // 0–100
  riskLabel: string;
  trustStability: string;
  trustSwing: number;
  trustMessage: string;
  boundaryNear: boolean;
  boundaryMessage?: string;
  isDoctor?: boolean;
  /** Pass previous screenings for the same patient, sorted oldest→newest. Omit/null to hide chart. */
  history?: HistoryPoint[] | null;
  patientName?: string;
};

/* ──────────────────────────── Clinical reference ranges ─────────────────── */

type RangeEntry = { lo: number; hi: number; unit: string; label: string };

const RANGES: Record<string, RangeEntry> = {
  age:  { lo: 18,    hi: 80,    unit: "yrs",        label: "Age" },
  bp:   { lo: 60,    hi: 120,   unit: "mmHg",       label: "Blood Pressure" },
  sg:   { lo: 1.005, hi: 1.025, unit: "",            label: "Specific Gravity" },
  bgr:  { lo: 70,    hi: 140,   unit: "mg/dL",      label: "Blood Glucose" },
  bu:   { lo: 7,     hi: 20,    unit: "mg/dL",      label: "Blood Urea" },
  sc:   { lo: 0.5,   hi: 1.2,   unit: "mg/dL",      label: "Serum Creatinine" },
  sod:  { lo: 135,   hi: 145,   unit: "mEq/L",      label: "Sodium" },
  pot:  { lo: 3.5,   hi: 5.0,   unit: "mEq/L",      label: "Potassium" },
  hemo: { lo: 12,    hi: 17.5,  unit: "g/dL",       label: "Hemoglobin" },
  pcv:  { lo: 36,    hi: 52,    unit: "%",           label: "Packed Cell Volume" },
  wbcc: { lo: 4000,  hi: 11000, unit: "cells/cumm", label: "WBC Count" },
  rbcc: { lo: 3.8,   hi: 6.1,   unit: "M/cmm",      label: "RBC Count" },
};

/* ──────────────────────────── Glossary tooltips ─────────────────────────── */

const GLOSSARY: Record<string, string> = {
  age:  "Your age in years. Older age is associated with higher CKD risk.",
  bp:   "Blood pressure (systolic). High BP can damage kidney blood vessels over time.",
  sg:   "Specific gravity of urine — reflects how concentrated your urine is. Kidneys losing function often produce dilute urine.",
  al:   "Albumin in urine (0–5 scale). Healthy kidneys retain protein; leakage (proteinuria) is an early CKD sign.",
  su:   "Sugar in urine (0–5 scale). Presence may indicate poorly controlled diabetes, a leading CKD cause.",
  rbc:  "Red blood cells in urine. 'Abnormal' means blood is present, which can indicate kidney damage or inflammation.",
  pc:   "Pus cells (white blood cells) in urine. Elevated levels suggest kidney infection or inflammation.",
  pcc:  "Pus cell clumps — clusters of pus cells, indicating significant urinary tract or kidney inflammation.",
  ba:   "Bacteria in urine. Their presence suggests infection, which can stress the kidneys if untreated.",
  bgr:  "Blood glucose (random test, mg/dL). Chronically high blood sugar damages kidney filtering units.",
  bu:   "Blood urea (mg/dL) — waste product normally cleared by healthy kidneys. High levels suggest reduced kidney function.",
  sc:   "Serum creatinine (mg/dL) — the most direct blood marker of kidney filtering ability. Even small rises are clinically significant.",
  sod:  "Sodium level in blood (mEq/L). Kidneys regulate sodium balance; abnormal levels often reflect kidney dysfunction.",
  pot:  "Potassium level in blood (mEq/L). Kidneys control potassium; high levels (hyperkalemia) are dangerous and common in CKD.",
  hemo: "Hemoglobin (g/dL) — oxygen-carrying protein in red blood cells. CKD suppresses its production, causing anaemia.",
  pcv:  "Packed cell volume (%) — proportion of blood made up of red blood cells. Low values reflect CKD-related anaemia.",
  wbcc: "White blood cell count (cells/cumm). Very high or low values may reflect infection or immune changes associated with CKD.",
  rbcc: "Red blood cell count (millions/cmm). Low count reflects anaemia, common in moderate-to-advanced CKD.",
  htn:  "Hypertension (high blood pressure). Both a cause and consequence of CKD; tightly linked to disease progression.",
  dm:   "Diabetes mellitus. The leading cause of CKD worldwide; damages the kidney's tiny filtering vessels.",
  cad:  "Coronary artery disease. Shares risk factors with CKD; its presence increases overall cardiovascular burden.",
  appet:"Appetite status. Poor appetite is a common symptom in moderate-to-advanced CKD due to toxin build-up.",
  pe:   "Pedal oedema — swelling in the feet/ankles. Fluid retention is common when kidneys lose the ability to excrete excess fluid.",
  ane:  "Anaemia — low red blood cell production. A hallmark of CKD; kidneys produce less erythropoietin as they lose function.",
};

/* ──────────────────────────── Age baseline lookup ───────────────────────── */

/**
 * TODO: Replace with a proper epidemiological reference dataset.
 * Source for future work: NHANES CKD prevalence by age group (CDC / USRDS).
 * These are rough CKD prevalence estimates (%) for the general population.
 * NOT personalised — used only as a soft visual reference line on the trend chart.
 */
const AGE_BASELINE_PCT: Array<{ minAge: number; maxAge: number; baseline: number }> = [
  { minAge: 18, maxAge: 39,  baseline: 4  },
  { minAge: 40, maxAge: 59,  baseline: 8  },
  { minAge: 60, maxAge: 69,  baseline: 17 },
  { minAge: 70, maxAge: 120, baseline: 38 },
];

function getAgeBaseline(age: number | undefined): number | null {
  if (!age || typeof age !== "number") return null;
  const bucket = AGE_BASELINE_PCT.find(b => age >= b.minAge && age <= b.maxAge);
  return bucket ? bucket.baseline : null;
}

/* ──────────────────────────── Feature label map ─────────────────────────── */

const FEATURE_LABELS: Record<string, string> = {
  age: "Age", bp: "Blood pressure", sg: "Specific gravity", al: "Albumin",
  su: "Sugar", rbc: "Red blood cells", pc: "Pus cells", pcc: "Pus cell clumps",
  ba: "Bacteria", bgr: "Blood glucose", bu: "Blood urea",
  sc: "Serum creatinine", sod: "Sodium", pot: "Potassium", hemo: "Hemoglobin",
  pcv: "Packed cell volume", wbcc: "WBC count",
  rbcc: "RBC count", htn: "Hypertension", dm: "Diabetes mellitus",
  cad: "Coronary artery disease", appet: "Appetite", pe: "Pedal edema", ane: "Anemia",
};

/* ──────────────────────────── Pure helpers ──────────────────────────────── */

function isRaising(direction: string) {
  return direction.toLowerCase().includes("increase");
}

function clamp(x: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, x));
}

function markerPos(value: number, lo: number, hi: number): number {
  if (hi === lo) return 50;
  return clamp(((value - lo) / (hi - lo)) * 100);
}

function valueStatus(value: number, lo: number, hi: number): "Low" | "Normal" | "High" {
  if (value < lo) return "Low";
  if (value > hi) return "High";
  return "Normal";
}

function buildNarrative(factors: TopFactor[]): string {
  const up   = factors.filter(f => isRaising(f.direction));
  const down = factors.filter(f => !isRaising(f.direction) && f.direction !== "no change");
  const names = (arr: TopFactor[]) =>
    arr.map(f => FEATURE_LABELS[f.feature] ?? f.feature).join(", ");
  if (up.length > 0 && down.length > 0) {
    return `This score is pulled up mainly by ${names(up)}, but offset by ${names(down)}.`;
  }
  if (up.length > 0) return `The main risk-raising factors are ${names(up)}.`;
  if (down.length > 0) return `The following factors are helping lower the risk: ${names(down)}.`;
  return "No dominant contributing factors were identified.";
}

function formatChartDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

/* ──────────────────────────── Tug-of-war bar ────────────────────────────── */

function TugBar({ factors }: { factors: TopFactor[] }) {
  const up   = factors.filter(f => isRaising(f.direction)).reduce((s, f) => s + f.impact, 0);
  const down = factors.filter(f => !isRaising(f.direction)).reduce((s, f) => s + f.impact, 0);
  const total = up + down || 1;
  const upPct = Math.round((up / total) * 100);

  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs font-semibold mb-1">
        <span className="text-rose-600">↑ Risk-raising  ({upPct}%)</span>
        <span className="text-emerald-600">({100 - upPct}%)  Risk-lowering ↓</span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-l-full bg-rose-400 transition-all duration-500"
          style={{ width: `${upPct}%` }}
        />
        <div className="h-full flex-1 rounded-r-full bg-emerald-400" />
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        Bar shows the relative share of model weight pulling risk up vs down.
      </p>
    </div>
  );
}

/* ──────────────────────────── Trend chart ───────────────────────────────── */

function TrendChart({
  history,
  currentPercent,
  ageBaseline,
}: {
  history: HistoryPoint[];
  currentPercent: number;
  ageBaseline: number | null;
}) {
  if (!history || history.length < 2) return null;

  // Include current result at end if not already there
  const allPoints = history.map(h => ({ date: h.date, pct: h.risk_score * 100 }));

  const maxPct = Math.max(...allPoints.map(p => p.pct), ageBaseline ?? 0, 10);
  const chartH = 80;
  const chartW = 300;
  const padL = 28;
  const padR = 8;
  const padT = 8;
  const padB = 20;

  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const toX = (i: number) => padL + (i / (allPoints.length - 1)) * innerW;
  const toY = (pct: number) => padT + innerH - (pct / (maxPct * 1.15)) * innerH;

  const polyline = allPoints
    .map((p, i) => `${toX(i)},${toY(p.pct)}`)
    .join(" ");

  const baselineY = ageBaseline !== null ? toY(ageBaseline) : null;

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-sm font-semibold text-slate-700">Risk over time</h4>
        {ageBaseline !== null && (
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <span className="inline-block w-5 border-t-2 border-dashed border-slate-300" />
            Age-group avg.{" "}
            <span className="text-slate-500 font-medium">{ageBaseline}%</span>
            {/* TODO: replace static lookup with validated reference dataset */}
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ maxHeight: 90 }}>
        {/* Grid lines */}
        {[0, 30, 70, 100].map(v => {
          const y = toY(v);
          if (y < padT || y > padT + innerH) return null;
          return (
            <g key={v}>
              <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#e2e8f0" strokeWidth={1} />
              <text x={padL - 3} y={y + 3} fontSize={8} fill="#94a3b8" textAnchor="end">{v}%</text>
            </g>
          );
        })}

        {/* Age baseline dashed line */}
        {baselineY !== null && (
          <line
            x1={padL} y1={baselineY}
            x2={chartW - padR} y2={baselineY}
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        {/* Risk-zone shading */}
        <rect x={padL} y={toY(70)} width={innerW} height={toY(30) - toY(70)} fill="#fef3c7" opacity={0.4} />
        <rect x={padL} y={padT} width={innerW} height={toY(70) - padT} fill="#fee2e2" opacity={0.3} />

        {/* Polyline */}
        <polyline
          points={polyline}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots */}
        {allPoints.map((p, i) => (
          <circle
            key={i}
            cx={toX(i)}
            cy={toY(p.pct)}
            r={i === allPoints.length - 1 ? 5 : 3.5}
            fill={i === allPoints.length - 1 ? "#0284c7" : "#7dd3fc"}
            stroke="white"
            strokeWidth={1.5}
          />
        ))}
      </svg>

      {/* Date labels */}
      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5" style={{ paddingLeft: padL, paddingRight: padR }}>
        {allPoints.map((p, i) => (
          <span key={i} className={i === allPoints.length - 1 ? "font-semibold text-sky-600" : ""}>
            {formatChartDate(p.date)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────── Tooltip wrapper ───────────────────────────── */

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center gap-1">
      {children}
      <button
        type="button"
        className="text-slate-300 hover:text-sky-500 transition"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        aria-label="More info"
      >
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" clipRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 100 2 1 1 0 000-2zm1 5a1 1 0 10-2 0v3a1 1 0 102 0v-3z" />
        </svg>
      </button>
      {show && (
        <span className="absolute bottom-full left-0 z-50 mb-1.5 w-60 rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-100 shadow-xl leading-relaxed">
          {text}
        </span>
      )}
    </span>
  );
}

/* ──────────────────────────── Range track ───────────────────────────────── */

function RangeTrack({ value, range, raising }: {
  value: number;
  range: RangeEntry;
  raising: boolean;
}) {
  const pos = markerPos(value, range.lo, range.hi);
  const status = valueStatus(value, range.lo, range.hi);

  const statusColor =
    status === "Low"    ? "text-sky-600 bg-sky-50 border-sky-200" :
    status === "High"   ? "text-rose-600 bg-rose-50 border-rose-200" :
    "text-emerald-700 bg-emerald-50 border-emerald-200";

  return (
    <div className="mt-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-slate-400">
          Range: {range.lo}–{range.hi} {range.unit}
        </span>
        <span className={`text-[11px] font-semibold rounded-full border px-2 py-0.5 ${statusColor}`}>
          {status}
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-slate-100">
        {/* Normal zone */}
        <div className="absolute h-full bg-emerald-100 rounded-full" style={{ left: "15%", right: "15%" }} />
        {/* Marker */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-white shadow-md ${raising ? "bg-rose-500" : "bg-emerald-500"}`}
          style={{ left: `calc(${pos}% - 7px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
        <span>{range.lo} {range.unit}</span>
        <span>{range.hi} {range.unit}</span>
      </div>
    </div>
  );
}

/* ──────────────────────────── Factor card ───────────────────────────────── */

function FactorCard({ factor, inputs }: { factor: TopFactor; inputs: Record<string, string | number> }) {
  const raising  = isRaising(factor.direction);
  const label    = FEATURE_LABELS[factor.feature] ?? factor.feature;
  const rawVal   = inputs?.[factor.feature];
  const range    = RANGES[factor.feature];
  const numVal   = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal));
  const hasBar   = !!range && range.lo < range.hi && !isNaN(numVal);
  const glossary = GLOSSARY[factor.feature];

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 leading-tight">
            {glossary ? (
              <Tooltip text={glossary}>
                <span>{label}</span>
              </Tooltip>
            ) : label}
          </p>
          {rawVal !== undefined && rawVal !== "" && (
            <p className="mt-0.5 text-xs text-slate-500">
              Your value:{" "}
              <span className="font-semibold text-slate-700">
                {rawVal}{range?.unit ? ` ${range.unit}` : ""}
              </span>
            </p>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1">
          {raising ? (
            <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600">
              ↑ Raising risk
            </span>
          ) : (
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              ↓ Lowering risk
            </span>
          )}
          {/* Impact magnitude bar */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">Impact</span>
            <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${raising ? "bg-rose-400" : "bg-emerald-400"}`}
                style={{ width: `${clamp(factor.impact * 400)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {hasBar && (
        <RangeTrack value={numVal} range={range!} raising={raising} />
      )}

      {/* Categorical value (no numeric range) */}
      {!hasBar && rawVal !== undefined && rawVal !== "" && (
        <p className="mt-1.5 text-xs text-slate-400">
          Reported as: <span className="font-medium text-slate-600 capitalize">{String(rawVal)}</span>
        </p>
      )}
    </div>
  );
}

/* ──────────────────────────── Trust box ─────────────────────────────────── */

function TrustBox({ stability, swing, message, isDoctor }: {
  stability: string; swing: number; message: string; isDoctor: boolean;
}) {
  const stable     = stability === "stable";
  const borderline = stability === "borderline";

  const { bg, border, text, icon, doctorLabel } = stable
    ? { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900", icon: "✓",
        doctorLabel: "Stable — this result is consistent" }
    : borderline
    ? { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", icon: "!",
        doctorLabel: "Borderline — interpret with some caution" }
    : { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-900", icon: "⚠",
        doctorLabel: "Unstable — recommend retesting or clinical follow-up" };

  const patientCopy = stable
    ? "This result looks consistent and reliable."
    : borderline
    ? "This result is fairly consistent, but retesting could help confirm it."
    : "This result could change if retested. We recommend confirming with your doctor.";

  return (
    <div className={`mt-5 rounded-xl border p-4 ${bg} ${border} ${text}`}>
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <p className="text-sm font-semibold">
          Explanation Confidence{isDoctor && `: ${doctorLabel}`}
        </p>
      </div>
      <p className="mt-1 text-sm">{isDoctor ? message : patientCopy}</p>
      {isDoctor && (
        <p className="mt-1 text-xs opacity-70">
          Score swing under 5% lab noise: {(swing * 100).toFixed(1)} percentage points
        </p>
      )}
    </div>
  );
}

/* ──────────────────────────── Boundary box ──────────────────────────────── */

function BoundaryBox({ near, message, isDoctor }: {
  near: boolean; message?: string; isDoctor: boolean;
}) {
  if (!near) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
        <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Clear classification margin — result is not near a threshold boundary
      </div>
    );
  }
  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
      <div className="flex items-center gap-2">
        <span className="text-base">⚠</span>
        <p className="text-sm font-semibold">Near risk-category boundary</p>
      </div>
      <p className="mt-1 text-sm text-amber-800">
        {isDoctor
          ? (message || "Result is near the 30%/70% clinical threshold. Classification could shift due to natural variation.")
          : "Your result is close to a different risk category — small changes could shift the outcome. Worth confirming with a follow-up test."}
      </p>
    </div>
  );
}

/* ──────────────────────────── Main export ───────────────────────────────── */

export default function FactorsExplainer({
  topFactors,
  inputs,
  percent,
  riskLabel,
  trustStability,
  trustSwing,
  trustMessage,
  boundaryNear,
  boundaryMessage,
  isDoctor = false,
  history,
  patientName,
}: FactorsExplainerProps) {
  if (!topFactors || topFactors.length === 0) return null;

  const narrative  = buildNarrative(topFactors);
  const riskTag    = riskLabel.replace(" estimated risk", "");
  const tagCls     = percent < 30
    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
    : percent <= 70
    ? "bg-amber-50 text-amber-900 border-amber-200"
    : "bg-rose-50 text-rose-800 border-rose-200";

  // Age baseline from inputs (if numeric)
  const ageRaw     = inputs?.age;
  const ageNum     = typeof ageRaw === "number" ? ageRaw : parseFloat(String(ageRaw));
  const ageBaseline = getAgeBaseline(isNaN(ageNum) ? undefined : ageNum);

  const hasHistory = Array.isArray(history) && history.length >= 2;

  return (
    <div className="mt-6 space-y-0">
      {/* ── Summary header card ── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
        {/* Risk tag + percent */}
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-3xl font-extrabold text-slate-800 tabular-nums">
            {percent.toFixed(1)}%
          </span>
          <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${tagCls}`}>
            {riskTag}
          </span>
        </div>

        {/* Narrative sentence */}
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{narrative}</p>

        {/* Tug-of-war */}
        <TugBar factors={topFactors} />
      </div>

      {/* ── Trend chart (hidden if <2 history points) ── */}
      {hasHistory && (
        <TrendChart
          history={history!}
          currentPercent={percent}
          ageBaseline={ageBaseline}
        />
      )}

      {/* ── Trust + Boundary ── */}
      <TrustBox
        stability={trustStability}
        swing={trustSwing}
        message={trustMessage}
        isDoctor={isDoctor}
      />
      <BoundaryBox near={boundaryNear} message={boundaryMessage} isDoctor={isDoctor} />

      {/* ── Per-factor cards ── */}
      <div>
        <h3 className="mt-5 text-sm font-semibold text-slate-700">
          Top contributing factors
        </h3>
        <p className="text-xs text-slate-400 mt-0.5 mb-3">
          Hover the ⓘ icon next to any factor for a plain-language description.
        </p>
        <div className="flex flex-col gap-3">
          {topFactors.map(f => (
            <FactorCard key={f.feature} factor={f} inputs={inputs} />
          ))}
        </div>
      </div>
    </div>
  );
}
