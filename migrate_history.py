import re

# ─── 3. HISTORY ─────────────────────────────────────────────────────────────────
with open(r'app\[locale]\history\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
content = content.replace(
    'import React, { useEffect, useState, Suspense } from "react";',
    'import React, { useEffect, useState, Suspense } from "react";\nimport { useUser } from "@/contexts/UserContext";'
)

# Remove old local state for userName and userRole
content = content.replace('  const [userName, setUserName] = useState<string>("");\n', '')
content = content.replace('  const [userRole, setUserRole] = useState<"doctor" | "patient" | null>(null);\n', '')

# Replace profile fetch block in useEffect
content = re.sub(
    r'const \{ data: profile \} = await supabase\.from\(\'user_profiles\'\)\.select\(\'full_name, role\'\)\.eq\(\'id\', user\.id\)\.single\(\);\s*console\.log\("[^"]*"\);\s*\s*if \(profile\) \{\s*setUserRole\(profile\.role\);\s*setUserName\(profile\.full_name \|\| ""\);\s*\}',
    '// profile loaded via UserContext',
    content
)

# Add useUser call inside component after router
content = content.replace(
    'function HistoryContent() {\n  const router = useRouter();\n  const searchParams',
    'function HistoryContent() {\n  const router = useRouter();\n  const { userProfile } = useUser();\n  const userName = userProfile?.full_name || "";\n  const userRole = (userProfile?.role as "doctor" | "patient" | null) || null;\n  const searchParams'
)

with open(r'app\[locale]\history\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("history: done")
