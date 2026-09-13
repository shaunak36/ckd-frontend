import os

files = ['app/page.tsx', 'app/help/page.tsx', 'app/settings/page.tsx', 'components/FaqAccordion.tsx']

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    if not content.startswith('"use client";'):
        content = '"use client";\n' + content.lstrip('\ufeff') # remove BOM if exists
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f"Added use client to {f}")
