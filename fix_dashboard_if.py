with open(r'app\[locale]\dashboard\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The regex left a dangling unclosed if block. Fix it by replacing the broken inner part.
old = '''        if (user && !cancelled) {

        const fetchUrl'''

new = '''        const fetchUrl'''

content = content.replace(old, new)

with open(r'app\[locale]\dashboard\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed dangling if block in dashboard")
