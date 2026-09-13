"use client";
import React from 'react';

export default function FaqAccordion() {
  const faqs = [
    { q: "What is CKD One?", a: "CKD One is an AI-powered screening tool designed to estimate the risk of Chronic Kidney Disease based on standard clinical and laboratory data." },
    { q: "Is this a diagnostic tool?", a: "No. CKD One provides an educational risk estimate. It is strictly a screening aid and should never replace a professional medical diagnosis or consultation with a qualified healthcare provider." },
    { q: "Who can use CKD One?", a: "CKD One is designed to be used by individuals wanting to better understand their kidney health metrics, as well as healthcare professionals looking for explainable screening aids." },
    { q: "How does the AI work?", a: "Our system uses an explainable machine learning model trained on historical clinical data. Crucially, it doesn't just output a risk score; it calculates the 'local feature importance' to tell you exactly which input factors contributed most to your specific result." },
    { q: "Is my data secure?", a: "Yes. All data is protected with industry-standard encryption and securely authenticated via Supabase." }
  ];

  return (
    <div className="flex flex-col gap-4">
      {faqs.map((faq, i) => (
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
  );
}
