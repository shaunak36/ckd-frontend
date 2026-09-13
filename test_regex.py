import re

text = 'className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 hover:bg-slate-50 dark:hover:bg-slate-800"'
result = re.sub(r'\s*dark:[^\s"\'\]+', '', text)
print(result)
