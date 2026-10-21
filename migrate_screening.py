import re

# ─── 4. SCREENING ────────────────────────────────────────────────────────────────
with open(r'app\[locale]\screening\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
content = content.replace(
    'import { FormEvent, useState, useEffect } from "react";',
    'import { FormEvent, useState, useEffect } from "react";\nimport { useUser } from "@/contexts/UserContext";'
)

# Remove old local state
content = content.replace('    const [userRole, setUserRole] = useState<string | null>(null);\n', '')
content = content.replace('    const [userName, setUserName] = useState("");\n', '')

# Replace profile fetch useEffect entirely
content = re.sub(
    r'    useEffect\(\(\) => \{\s*let cancelled = false;\s*\(async \(\) => \{\s*const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\);\s*if \(user && !cancelled\) \{\s*const \{ data: profile \} = await supabase\s*\.from\("user_profiles"\)\s*\.select\("role, full_name"\)\s*\.eq\("id", user\.id\)\s*\.single\(\);\s*console\.log\("[^"]*"\);\s*if \(profile\?\.role && !cancelled\) \{\s*setUserRole\(profile\.role\);\s*\}\s*\}\s*\}\)\(\);\s*return \(\) => \{\s*cancelled = true;\s*\};\s*\}, \[\]\);\s*\n',
    '',
    content,
    flags=re.DOTALL
)

# Add useUser hook call inside the ScreeningContent function
content = re.sub(
    r'(function ScreeningContent\(\) \{)',
    r'\1\n  const { userProfile } = useUser();\n  const userRole = userProfile?.role || null;\n  const userName = userProfile?.full_name || "";',
    content
)

with open(r'app\[locale]\screening\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("screening: done")
