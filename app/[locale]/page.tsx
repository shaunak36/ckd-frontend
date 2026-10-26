"use client";
import React, { useState } from "react";
import { Link } from "@/i18n/routing";
import FaqAccordion from "@/components/FaqAccordion";
import {
  QUICK_ALBUMIN_OPTIONS,
  QUICK_HYPERTENSION_OPTIONS,
  QUICK_NUMERIC_FIELDS,
  QUICK_SPECIFIC_GRAVITY_OPTIONS,
} from "@/lib/quickScreen";

/* --- Components --- */

function CheckIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function FactorBar({ label, level, widthClass, colorClass }: { label: string; level: string; widthClass: string; colorClass: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-xs font-semibold text-slate-500">{level}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${widthClass} ${colorClass}`} />
      </div>
    </div>
  );
}

const QUICK_FACTOR_LABELS: Record<string, string> = {
  sg: "Specific gravity",
  hemo: "Hemoglobin",
  al: "Albumin",
  sc: "Serum creatinine",
  bu: "Blood urea",
  rbcc: "Red blood cell count",
  bgr: "Blood glucose",
  htn: "Hypertension",
};

type QuickFeatures = {
  sg: string;
  al: string;
  bgr: string;
  bu: string;
  sc: string;
  hemo: string;
  rbcc: string;
  htn: string;
};

type QuickKey = keyof QuickFeatures;

type PredictResponse = {
  risk_percentage: string;
  top_factors: {
    feature: string;
    direction: string;
    impact: number;
  }[];
  trust?: {
    stability: string;
    swing: number;
  };
};

const QUICK_FIELDS = [
  ["sg", "Specific gravity"],
  ["al", "Albumin"],
  ["htn", "Hypertension"],
  ["sc", "Serum creatinine (mg/dL)"],
  ["bu", "Blood urea (mg/dL)"],
  ["hemo", "Hemoglobin (g/dL)"],
  ["rbcc", "Red blood cell count (millions/cmm)"],
  ["bgr", "Blood glucose, random (mg/dL)"],
] as const satisfies readonly (readonly [QuickKey, string])[];

const QUICK_NUMERIC_FIELD_SET = new Set<string>(QUICK_NUMERIC_FIELDS);

const INITIAL_FEATURES: QuickFeatures = {
  sg: "", al: "", htn: "", sc: "", bu: "", hemo: "", rbcc: "", bgr: "",
};

function SampleResultCard({
  result,
  features,
  sample = false,
  className = "",
}: {
  result: PredictResponse | null;
  features?: QuickFeatures;
  sample?: boolean;
  className?: string;
}) {
  const risk = sample ? "31.5%" : result?.risk_percentage;
  const numericRisk = risk ? Number.parseFloat(risk.replace("%", "")) : 0;

  return (
    <div className={`flex w-full max-w-md flex-col rounded-2xl border border-slate-300 bg-white p-6 shadow-xl sm:p-8 ${className}`}>
      {/* Risk Output */}
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{sample ? "Sample result" : "CKD Risk Estimate"}</p>
        {result || sample ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimated CKD risk</p>
            <p className="text-6xl font-extrabold text-red-700">{risk}</p>
            <p className="text-sm font-semibold text-amber-700">{sample ? "(Moderate)" : ""}</p>
          </>
        ) : (
          <p className="text-sm font-semibold text-slate-500">Illustrative sample, not model output</p>
        )}
      </div>

      {/* Gauge */}
      <div className="mt-6">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-red-500"
            style={{ width: `${(result || sample) && Number.isFinite(numericRisk) ? Math.min(Math.max(numericRisk, 0), 100) : 0}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-400">
          <span>0%</span>
          <span>30%</span>
          <span>70%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
        {result?.trust ? (
          <>Explanation stability: {result.trust.stability} · swing {(result.trust.swing * 100).toFixed(1)}%</>
        ) : (
          "Explanation stability: checked on every result"
        )}
      </div>

      {/* Contributing Factors */}
      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{sample ? "Explainable AI: Why 31.5%?" : "Contributing Factors"}</h3>
        <div className="mt-4 flex flex-col gap-4">
          {sample ? [
            ["Albumin", "44%", "w-[44%]", "bg-red-500"],
            ["Hemoglobin", "40%", "w-[40%]", "bg-emerald-500"],
            ["Serum creatinine", "16%", "w-[16%]", "bg-emerald-500"],
          ].map(([label, level, widthClass, colorClass]) => (
            <FactorBar key={label} label={label} level={`${level} ${label === "Albumin" ? "(increases risk)" : "(decreases)"}`} widthClass={widthClass} colorClass={colorClass} />
          )) : result ? (() => {
            const factors = result.top_factors || [];
            const largestImpact = Math.max(...factors.map((factor) => Math.abs(factor.impact)), 0);
            return factors.map((factor) => {
              const value = features?.[factor.feature as QuickKey] ?? "—";
              const width = largestImpact > 0 ? (Math.abs(factor.impact) / largestImpact) * 100 : 0;
              const increasesRisk = factor.direction.toLowerCase().includes("increase");
              return (
                <div key={factor.feature} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{QUICK_FACTOR_LABELS[factor.feature] || factor.feature}</span>
                    <span className="text-xs font-semibold text-slate-500">{value}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${increasesRisk ? "bg-red-500" : "bg-emerald-500"}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            });
          })() : (
            <p className="text-sm text-slate-500">Submit patient features to see model factors.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* --- Main Page --- */

export default function LandingPage() {
  const [features, setFeatures] = useState<QuickFeatures>(INITIAL_FEATURES);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePredict(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const hasInvalidField = QUICK_FIELDS.some(([key]) => {
      const value = features[key].trim();
      return !value || (QUICK_NUMERIC_FIELD_SET.has(key) && !Number.isFinite(Number(value)));
    });

    if (hasInvalidField) {
      setResult(null);
      setError("Please fill in all fields");
      return;
    }

    const body = Object.fromEntries(
      QUICK_FIELDS.map(([key]) => [
        key,
        QUICK_NUMERIC_FIELD_SET.has(key) ? Number(features[key]) : features[key],
      ]),
    );

    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/predict-quick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let detail = "";
        try {
          const errorBody = await response.json();
          detail = typeof errorBody.detail === "string"
            ? errorBody.detail
            : Array.isArray(errorBody.detail)
              ? errorBody.detail.map((item: { msg?: string }) => item.msg || "Invalid value").join(", ")
              : "";
        } catch {
          detail = "";
        }
        throw new Error(detail || "The prediction service could not validate those values. Please check the form and try again.");
      }

      setResult((await response.json()) as PredictResponse);
    } catch (requestError) {
      setResult(null);
      setError(requestError instanceof Error ? requestError.message : "Unable to reach the prediction service");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900">
      
      {/* Navigation */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-700 font-bold text-white">
            C
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">CKD One</span>
        </div>
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="#" className="text-sm font-medium text-slate-600 hover:text-sky-700">Product</Link>
          <Link href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-sky-700">How it works</Link>
          <Link href="#why-ckd-one" className="text-sm font-medium text-slate-600 hover:text-sky-700">Why CKD One</Link>
          <Link href="#for-doctors" className="text-sm font-medium text-slate-600 hover:text-sky-700">For Doctors</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-sky-700">
            Sign In
          </Link>
          <Link href="/signup" className="hidden rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 sm:inline-flex">
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-sky-50 px-6 py-16 md:py-24 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="flex max-w-2xl flex-col items-start text-left">
                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                  AI-powered kidney health screening
                </span>
                <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
                  Understand Your <span className="text-sky-700">Kidney Health</span> Earlier.
                </h1>
                <p className="mt-6 text-lg leading-8 text-slate-600">
                  CKD One uses explainable machine learning to estimate chronic kidney disease risk from clinical and laboratory data — and shows you the factors behind the result.
                </p>
                <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <Link href="/signup" className="rounded-lg bg-sky-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800">
                    Check CKD Risk →
                  </Link>
                  <Link href="#how-it-works" className="text-sm font-semibold text-sky-700 hover:underline">
                    See How It Works
                  </Link>
                </div>
                <p className="mt-6 text-xs text-slate-500 sm:max-w-md">
                  CKD One provides risk screening and educational information. It does not replace diagnosis or medical advice from a qualified healthcare professional.
                </p>
              </div>
              <div className="flex justify-center lg:justify-end lg:pt-0">
                <div className="relative">
                  {/* Decorative blob behind card */}
                  <div className="absolute -inset-4 rounded-full bg-sky-200/50 blur-3xl" />
                  <SampleResultCard result={null} sample className="relative z-10" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick estimate section */}
        <section id="quick-estimate" className="bg-white px-6 py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Start with eight values</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Try a quick estimate</h2>
              <p className="mt-4 text-lg text-slate-600">Enter the most predictive values from a recent lab report to see an educational CKD risk estimate.</p>
            </div>
            <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
              <form onSubmit={handlePredict} className="rounded-2xl border border-slate-300 bg-slate-50 p-5 shadow-sm sm:p-7">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {QUICK_FIELDS.map(([key, label]) => {
                    const options: readonly { value: string; label: string }[] | undefined = key === "sg"
                      ? QUICK_SPECIFIC_GRAVITY_OPTIONS
                      : key === "al"
                        ? QUICK_ALBUMIN_OPTIONS
                        : key === "htn"
                          ? QUICK_HYPERTENSION_OPTIONS
                          : undefined;

                    return (
                      <label key={key} className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                        {label}
                        {options ? (
                          <select
                            value={features[key]}
                            onChange={(event) => setFeatures((current) => ({ ...current, [key]: event.target.value }))}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900"
                          >
                            <option value="">Select</option>
                            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        ) : (
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder={
                              key === "sc" ? "e.g. 1.2"
                                : key === "bu" ? "e.g. 40"
                                  : key === "hemo" ? "e.g. 12.5"
                                    : key === "rbcc" ? "e.g. 4.5"
                                      : "e.g. 120"
                            }
                            value={features[key]}
                            onChange={(event) => setFeatures((current) => ({ ...current, [key]: event.target.value }))}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900"
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
                <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link href="/signup" className="text-sm font-semibold text-sky-700 hover:underline">Want the full 24-value screening? Get started</Link>
                  <button
                    type="submit"
                    disabled={loading || QUICK_FIELDS.some(([key]) => !features[key].trim())}
                    className="rounded-lg bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Loading..." : "Get live prediction"}
                  </button>
                </div>
                {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
              </form>
              <div className="lg:sticky lg:top-24">
                <SampleResultCard result={result} features={features} />
              </div>
            </div>
          </div>
        </section>

        {/* CKD can develop silently section */}
        <section id="why-ckd-one" className="bg-white px-6 py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">CKD can develop silently</h2>
              <p className="mt-4 text-lg text-slate-600">
                Millions of people have chronic kidney disease and don't know it. We built CKD One to bring clarity to early screening and detection.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: "Early detection matters", desc: "Identifying kidney stress earlier allows for interventions that can slow or prevent disease progression." },
                { title: "Lab reports are hard to interpret", desc: "Clinical markers like serum creatinine and specific gravity interact in complex ways that are difficult to assess manually." },
                { title: "Black-box AI is hard to trust", desc: "Many risk models provide a score without context, leaving patients and doctors unsure of why a prediction was made." },
                { title: "Decisions need understandable explanations", desc: "We provide not just a risk percentage, but a clear, ranked list of the exact clinical factors driving your result." }
              ].map((card, i) => (
                <div key={i} className="rounded-2xl border border-slate-300 bg-slate-50 p-6 shadow-sm">
                  <h3 className="font-semibold text-slate-900">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How CKD One Works */}
        <section id="how-it-works" className="bg-slate-50 px-6 py-16 lg:px-8 lg:py-20 border-y border-slate-200">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">How CKD One works</h2>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-4">
              {[
                { num: "01", title: "Enter your information", desc: "Input basic demographics and medical history." },
                { num: "02", title: "Add laboratory data", desc: "Provide values from your latest urine and blood tests." },
                { num: "03", title: "CKD One analyzes the data", desc: "Our model evaluates your specific lab profile." },
                { num: "04", title: "Understand your risk", desc: "Receive a transparent estimate with top contributing factors." }
              ].map((step, i) => (
                <div key={i} className="relative flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-lg font-bold text-sky-700">
                    {step.num}
                  </div>
                  <h3 className="mt-6 font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Don't just get a prediction. Understand it. */}
        <section className="bg-slate-900 px-6 py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-12">
              <div className="max-w-xl text-left">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Don't just get a prediction.<br/>Understand it.
                </h2>
                <p className="mt-6 text-lg text-slate-400">
                  Trust in AI comes from transparency. CKD One doesn't just give you a number. It gives you the "why".
                </p>
                <ul className="mt-8 flex flex-col gap-5 text-slate-300">
                  {[
                    "Clear risk estimate with visual gauge",
                    "Top contributing factors ranked by importance",
                    "Explanation stability indicator",
                    "Plain-language descriptions of each factor"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-400">
                        <CheckIcon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-4 lg:items-end">
                <div className="w-full max-w-md rounded-2xl border border-amber-400/50 bg-amber-400/10 p-5 text-amber-100 shadow-lg">
                  <p className="text-sm font-semibold">How reliable is this explanation?</p>
                  <p className="mt-2 text-sm leading-relaxed text-amber-200">Unstable: small changes in lab values could shift this result.</p>
                </div>
                <div className="w-full max-w-md rounded-2xl border border-yellow-300/50 bg-yellow-300/10 p-4 text-yellow-100 shadow-lg">
                  <p className="text-sm font-semibold">Near risk-category boundary</p>
                  <p className="mt-1 text-xs leading-relaxed text-yellow-200">The classification could move with normal day-to-day variation in lab values.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* For healthcare professionals */}
        <section id="for-doctors" className="bg-sky-50 px-6 py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">For healthcare professionals</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Designed to support informed clinical conversations.
                </h2>
                <div className="mt-10">
                  <Link href="/login" className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
                    Explore the Dashboard →
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  "Patient screening records",
                  "Explainable predictions",
                  "Screening history and trends",
                  "Laboratory report upload",
                  "Structured patient information",
                  "Clear risk visualization"
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm border border-slate-200">
                    <CheckIcon className="h-5 w-5 shrink-0 text-sky-600" />
                    <span className="text-sm font-medium text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Transparent by design */}
        <section className="bg-white px-6 py-16 lg:px-8 lg:py-20 border-y border-slate-200">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">Transparent by design</h2>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Explainable predictions", desc: "Local feature importance tells you exactly what drove the model's estimate." },
                { title: "Human review always required", desc: "Built as an educational screening aid, not an automated diagnostician." },
                { title: "Clear limitations stated", desc: "Model confidence and stability are calculated and displayed for every result." },
                { title: "Secure account access", desc: "Your data is protected behind industry-standard authentication." },
                { title: "Private by default", desc: "Your screenings are visible only to your own account." },
                { title: "Transparent workflow", desc: "Every step from data input to risk output is clearly mapped out." }
              ].map((item, i) => (
                <div key={i} className="rounded-2xl border border-slate-300 bg-slate-50 p-6 shadow-sm">
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-slate-50 px-6 py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">Frequently Asked Questions</h2>
            <div className="mt-12">
              <FaqAccordion />
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-white px-6 py-24 text-center lg:px-8 lg:py-32">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">Start understanding your kidney health.</h2>
            <p className="mt-6 text-lg text-slate-600">
              Create a free account today to start screening and track your estimated risk over time.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/signup" className="rounded-lg bg-sky-700 px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800">
                Get Started — Free
              </Link>
              <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-sky-700">
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-700 font-bold text-white">
                  C
                </div>
                <span className="text-lg font-bold tracking-tight text-slate-900">CKD One</span>
              </div>
              <p className="mt-4 text-sm text-slate-500 max-w-sm">
                Explainable AI for chronic kidney disease screening and educational awareness.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Product</h3>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-slate-500">
                <li><Link href="#quick-estimate" className="hover:text-sky-700">Screening Tool</Link></li>
                <li><Link href="#how-it-works" className="hover:text-sky-700">How it works</Link></li>
                <li><Link href="#for-doctors" className="hover:text-sky-700">For Professionals</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Resources</h3>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-slate-500">
                <li><Link href="/help" className="hover:text-sky-700">Help Center</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Legal</h3>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-slate-500">
                <li><Link href="/help" className="hover:text-sky-700">Privacy Policy</Link></li>
                <li><Link href="/help" className="hover:text-sky-700">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} CKD One. All rights reserved.
            </p>
            <p className="text-xs text-slate-400 max-w-xl text-center sm:text-right">
              <strong className="font-semibold text-slate-500">Medical Disclaimer:</strong> CKD One is a screening and educational platform and is not a substitute for professional medical diagnosis or treatment.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}