import re

with open('app/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '"bg-emerald-50 text-emerald-800 border-emerald-200"',
    '"bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"'
)
content = content.replace(
    '"bg-amber-50 text-amber-900 border-amber-200"',
    '"bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800"'
)
content = content.replace(
    '"bg-red-50 text-red-800 border-red-200"',
    '"bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800"'
)
content = content.replace(
    '"bg-red-50 text-red-800 border-red-300"',
    '"bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700"'
)

with open('app/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
