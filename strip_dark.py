import re
import os

files = [
    'app/page.tsx',
    'app/login/page.tsx',
    'app/signup/page.tsx',
    'app/reset-password/page.tsx'
]

pattern = r'\s*dark:[^\s"\']+'

for file in files:
    if os.path.exists(file):
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = re.sub(pattern, '', content)
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file}")
