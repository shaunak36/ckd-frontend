# CKD One (Frontend)

**Explainable AI-based early-stage Chronic Kidney Disease (CKD) risk prediction and clinical decision support.**

CKD One doesn't just output a risk number. It shows *why* the AI gave that result, and how *reliable* that explanation is.

**Live app:** https://ckd-frontend-iota.vercel.app
**Backend repo:** `ckd-backend` (FastAPI, deployed on Render)

> Capstone Project-I, B.E. Artificial Intelligence & Machine Learning, St. John College of Engineering and Management (SJCEM), 2023-2027.

---

## What it does

- **Explainable AI results:** every screening shows the risk %, a "Why is your risk X%?" breakdown of the top contributing factors (SHAP-style), each with the patient's value vs the typical range
- **Trust / stability check:** flags results that could change under small input noise, plus a boundary badge when the score sits near a risk-band threshold
- **Quick Screen vs Detailed Screen:** 8-feature or full 24-feature model
- **Lab report upload:** upload a PDF/image and the form auto-fills (review before submit)
- **AI assistant:** ask questions about a specific result (explains only, no diagnosis or treatment advice)
- **Doctor and patient roles:** doctors get a dashboard (patient list, reports, history, outcome tracking); patients get a simplified view of their own results
- **Clinical outcome tracking:** doctors mark screenings as confirmed / not confirmed to track real-world accuracy
- **PDF report export, risk trend charts, CSV export**
- **PWA** (installable), **dark mode**, i18n scaffolding (English / Hindi / Marathi)

## Tech stack

Next.js (App Router), TypeScript, Tailwind CSS, next-intl, Supabase Auth, recharts, react-markdown, next-pwa. Deployed on Vercel.

## Getting started

```bash
git clone <this-repo-url>
cd ckd-frontend
npm install
```

Create `.env.local` (check the names against your code):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Run it:

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
```

You also need the backend running (see `ckd-backend`).

## Project structure (main parts)

```
app/[locale]/
  page.tsx            Landing page
  login, signup, ...  Auth pages
  screening/          Screening form (Quick / Detailed, report upload)
  dashboard/          Doctor dashboard + patient detail
  my-results/         Patient view
  patients, history, reports, assistant, settings, help
components/           Sidebar, ThemeToggle, AuthGuard, ...
contexts/             Shared state
```

## Research angle

Most CKD explainable-AI papers generate SHAP/LIME explanations but never check whether those explanations are *reliable*. CKD One adds a perturbation-based consistency check and surfaces it in the UI.

Findings so far (UCI CKD dataset, XGBoost):
- Under 5% simulated lab noise, about half of test patients showed a risk swing above 20 percentage points
- An 8-feature Quick Screen model matched the 24-feature model in performance and in instability profile

## Limitations

- Trained on a small public dataset (400 patients, 24 features) with no external validation
- Near-perfect AUC on this dataset should not be read as real-world performance
- Typical ranges shown in the UI are general references and vary by lab, age, and sex

## Disclaimer

CKD One is an academic research project and screening aid. **It is not a medical device and does not provide a diagnosis.** Always consult a qualified doctor.

## Team
Shaunak Paul
Yash More
Vrinda Khare 
