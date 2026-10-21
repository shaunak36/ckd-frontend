import re

# ─── 2. MY-RESULTS ──────────────────────────────────────────────────────────────
with open(r'app\[locale]\my-results\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
content = content.replace(
    'import React, { useEffect, useState } from "react";',
    'import React, { useEffect, useState } from "react";\nimport { useUser } from "@/contexts/UserContext";'
)

# Remove old local state
content = content.replace('  const [patientName, setPatientName] = useState<string | null>(null);\n', '')

# Replace the profile fetch block
content = re.sub(
    r'const \{ data: profile \} = await supabase\.from\(\'user_profiles\'\)\.select\(\'full_name\'\)\.eq\(\'id\', user\.id\)\.single\(\);\s*console\.log\("[^"]*"\);\s*if \(profile\?\.full_name\) \{\s*setPatientName\(profile\.full_name\);\s*\}',
    '// profile loaded via UserContext',
    content
)

# Add useUser call inside component function, right after router
content = content.replace(
    'function MyResultsContent() {\n  const router = useRouter();\n  const [screenings',
    'function MyResultsContent() {\n  const router = useRouter();\n  const { userProfile } = useUser();\n  const patientName = userProfile?.full_name || null;\n  const [screenings'
)

with open(r'app\[locale]\my-results\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("my-results: done")
