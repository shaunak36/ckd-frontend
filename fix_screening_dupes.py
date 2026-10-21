with open(r'app\[locale]\screening\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the leftover duplicate state declarations that weren't removed by regex
content = content.replace(
    '  const [userRole, setUserRole] = useState<string | null>(null);\n  const [userName, setUserName] = useState("");\n',
    ''
)

with open(r'app\[locale]\screening\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed duplicates from screening")
