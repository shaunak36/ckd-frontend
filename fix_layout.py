import os

filepath = 'app/[locale]/layout.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace \ try { ... } catch (_) {} \ with  try { ... } catch (_) {} 
import re
content = re.sub(r'__html: \\\s*(try \{.*?catch \(\_\) \{\})\s*\\,', r'__html: \n                \1\n              ,', content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
