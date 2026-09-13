import re

with open('app/settings/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix profile message class
content = re.sub(
    r'<p className=\{\t?ext-sm \}>',
    r'<p className={	ext-sm }>',
    content
)

# Fix password message class
content = re.sub(
    r'<p className=\{\t?ext-sm \}>',
    r'<p className={	ext-sm }>',
    content
)

with open('app/settings/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
