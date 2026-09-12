import Link from "next/link";
import { ReactNode } from "react";

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

function SampleResultCard({ className = "" }: { className?: string }) {
  return (
    <div className={`flex w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8 ${className}`}>
      {/* Risk Output */}
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">CKD Risk Estimate</p>
        <p className="text-6xl font-extrabold text-red-700">72%</p>
        <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
          Higher Risk
        </span>
      </div>

      {/* Gauge */}
      <div className="mt-6">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-[72%] rounded-full bg-red-500" />
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-400">
          <span>0%</span>
          <span>30%</span>
          <span>70%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Confidence */}
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2">
          <span className="text-emerald-700">
            <CheckIcon className="h-4 w-4" />
          </span>
          <p className="text-sm font-semibold text-emerald-900">Explanation Confidence: Stable</p>
        </div>
        <p className="mt-1 text-xs text-emerald-800">Factors were consistent across model checks.</p>
      </div>

      {/* Contributing Factors */}
      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contributing Factors</h3>
        <div className="mt-4 flex flex-col gap-4">
          <FactorBar label="Serum creatinine" level="Strong" widthClass="w-[90%]" colorClass="bg-red-500" />
          <FactorBar label="Blood pressure" level="Strong" widthClass="w-[75%]" colorClass="bg-red-400" />
          <FactorBar label="Specific gravity" level="Moderate" widthClass="w-[45%]" colorClass="bg-amber-400" />
        </div>
      </div>
    </div>
  );
}

/* --- Main Page --- */

export default function LandingPage() {
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
            <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-8">
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
              <div className="flex justify-center lg:justify-end">
                <div className="relative">
                  {/* Decorative blob behind card */}
                  <div className="absolute -inset-4 rounded-full bg-sky-200/50 blur-3xl" />
                  <SampleResultCard className="relative z-10" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CKD can develop silently section */}
        <section id="why-ckd-one" className="bg-white px-6 py-20 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">CKD can develop silently</h2>
              <p className="mt-4 text-lg text-slate-600">
                Millions of people have chronic kidney disease and don't know it. We built CKD One to bring clarity to early screening and detection.
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: "Early detection matters", desc: "Identifying kidney stress earlier allows for interventions that can slow or prevent disease progression." },
                { title: "Lab reports are hard to interpret", desc: "Clinical markers like serum creatinine and specific gravity interact in complex ways that are difficult to assess manually." },
                { title: "Black-box AI is hard to trust", desc: "Many risk models provide a score without context, leaving patients and doctors unsure of why a prediction was made." },
                { title: "Decisions need understandable explanations", desc: "We provide not just a risk percentage, but a clear, ranked list of the exact clinical factors driving your result." }
              ].map((card, i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-6 shadow-sm">
                  <h3 className="font-semibold text-slate-900">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How CKD One Works */}
        <section id="how-it-works" className="bg-slate-50 px-6 py-20 lg:px-8 lg:py-24 border-y border-slate-200">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">How CKD One works</h2>
            </div>
            <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-4">
              {[
                { num: "01", title: "Enter your information", desc: "Input basic demographics and medical history." },
                { num: "02", title: "Add laboratory data", desc: "Provide values from your latest urine and blood tests." },
                { num: "03", title: "CKD One analyzes the data", desc: "Our localized AI model evaluates your specific profile." },
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
        <section className="bg-slate-900 px-6 py-20 lg:px-8 lg:py-24">
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
              <div className="flex justify-center lg:justify-end">
                <SampleResultCard />
              </div>
            </div>
          </div>
        </section>

        {/* For healthcare professionals */}
        <section id="for-doctors" className="bg-sky-50 px-6 py-20 lg:px-8 lg:py-24">
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
        <section className="bg-white px-6 py-20 lg:px-8 lg:py-24 border-y border-slate-200">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">Transparent by design</h2>
            <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Explainable predictions", desc: "Local feature importance tells you exactly what drove the model's estimate." },
                { title: "Human review always required", desc: "Built as an educational screening aid, not an automated diagnostician." },
                { title: "Clear limitations stated", desc: "Model confidence and stability are calculated and displayed for every result." },
                { title: "Secure account access", desc: "Your data is protected behind industry-standard authentication." },
                { title: "Patient-controlled information", desc: "You control who has access to your risk screening dashboard." },
                { title: "Transparent workflow", desc: "Every step from data input to risk output is clearly mapped out." }
              ].map((item, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-slate-50 px-6 py-20 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">Frequently Asked Questions</h2>
            <div className="mt-12 flex flex-col gap-4">
              {[
                { q: "What is CKD One?", a: "CKD One is an AI-powered screening tool designed to estimate the risk of Chronic Kidney Disease based on standard clinical and laboratory data." },
                { q: "Is this a diagnostic tool?", a: "No. CKD One provides an educational risk estimate. It is strictly a screening aid and should never replace a professional medical diagnosis or consultation with a qualified healthcare provider." },
                { q: "Who can use CKD One?", a: "CKD One is designed to be used by individuals wanting to better understand their kidney health metrics, as well as healthcare professionals looking for explainable screening aids." },
                { q: "How does the AI work?", a: "Our system uses an explainable machine learning model trained on historical clinical data. Crucially, it doesn't just output a risk score; it calculates the 'local feature importance' to tell you exactly which input factors contributed most to your specific result." },
                { q: "Is my data secure?", a: "Yes. All data is protected with industry-standard encryption and securely authenticated via Supabase." }
              ].map((faq, i) => (
                <details key={i} className="group rounded-2xl border border-slate-200 bg-white p-6 open:bg-sky-50/50">
                  <summary className="flex cursor-pointer items-center justify-between font-semibold text-slate-900 marker:content-none">
                    {faq.q}
                    <span className="text-slate-400 transition group-open:rotate-180">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-4 text-sm leading-relaxed text-slate-600">{faq.a}</p>
                </details>
              ))}
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
                <li><Link href="#" className="hover:text-sky-700">Screening Tool</Link></li>
                <li><Link href="#" className="hover:text-sky-700">How it works</Link></li>
                <li><Link href="#" className="hover:text-sky-700">Pricing</Link></li>
                <li><Link href="#" className="hover:text-sky-700">For Professionals</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Resources</h3>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-slate-500">
                <li><Link href="#" className="hover:text-sky-700">Help Center</Link></li>
                <li><Link href="#" className="hover:text-sky-700">Research & Models</Link></li>
                <li><Link href="#" className="hover:text-sky-700">Clinical Guidelines</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Legal</h3>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-slate-500">
                <li><Link href="#" className="hover:text-sky-700">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-sky-700">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-sky-700">Cookie Policy</Link></li>
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