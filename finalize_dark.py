import re
import os

def process_file(path, replacements):
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for search, replace in replacements.items():
        content = content.replace(search, replace)
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# Settings inputs
settings_reps = {
    'className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 shadow-sm focus:border-sky-500 dark:focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:focus:ring-sky-400 sm:text-sm"':
    'className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 shadow-sm focus:border-sky-500 dark:focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:focus:ring-sky-400 sm:text-sm"'
}
process_file('app/settings/page.tsx', settings_reps)

# Screening inputs
screening_reps = {
    'className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 shadow-sm outline-none transition focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-200"':
    'className="mt-1 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm outline-none transition focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-900/50"',
    
    'hover:bg-sky-50"': 'hover:bg-sky-50 dark:hover:bg-slate-800"'
}
process_file('app/screening/page.tsx', screening_reps)

# Dashboard [id] chat bubbles and inputs
dash_id_reps = {
    'className="prose prose-sm prose-slate max-w-none"': 'className="prose prose-sm prose-slate dark:prose-invert max-w-none"',
    'className="w-full rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-1.5 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-50 placeholder-slate-400 outline-none transition focus:border-sky-500 dark:focus:border-sky-400 focus:bg-white focus:ring-1 focus:ring-sky-500 dark:focus:ring-sky-400"':
    'className="w-full rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 py-1.5 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-sky-500 dark:focus:border-sky-400 focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-sky-500 dark:focus:ring-sky-400"'
}
process_file('app/dashboard/[id]/page.tsx', dash_id_reps)

# Auth pages (Login, Signup, Reset Password)
auth_files = ['app/login/page.tsx', 'app/signup/page.tsx', 'app/reset-password/page.tsx']
auth_reps = {
    'className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 shadow-sm focus:border-sky-500 dark:focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:focus:ring-sky-400 sm:text-sm"':
    'className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 px-3 py-2 shadow-sm focus:border-sky-500 dark:focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:focus:ring-sky-400 sm:text-sm"'
}
for f in auth_files:
    process_file(f, auth_reps)

