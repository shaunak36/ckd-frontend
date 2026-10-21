import re

# ─── 1. DASHBOARD ───────────────────────────────────────────────────────────────
with open(r'app\[locale]\dashboard\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace import
content = content.replace(
    'import React, { useEffect, useState } from "react";',
    'import React, { useEffect, useState } from "react";\nimport { useUser } from "@/contexts/UserContext";'
)

# Remove the old local state for doctorName
content = content.replace(
    '  const [doctorName, setDoctorName] = useState<string | null>(null);\n',
    ''
)

# Replace the profile fetch block with useUser()
content = re.sub(
    r"  /\* fetch on mount \*/\s*useEffect\(\(\) => \{\s*let cancelled = false;\s*\(async \(\) => \{\s*try \{\s*const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\);\s*\s*if \(user && !cancelled\) \{\s*const \{ data: profile \} = await supabase\.from\('user_profiles'\)\.select\('full_name, role'\)\.eq\('id', user\.id\)\.single\(\);\s*console\.log\(\".*?\"\);\s*\s*if \(profile\?\.role === \"patient\"\) \{\s*router\.push\(\"/my-results\"\);\s*return;\s*\}\s*\s*if \(profile\?\.full_name\) \{\s*setDoctorName\(profile\.full_name\);\s*\}\s*\}",
    '''  /* redirect patients */
  const { userProfile } = useUser();
  const doctorName = userProfile?.full_name || null;

  useEffect(() => {
    if (userProfile && userProfile.role === 'patient') {
      router.push('/my-results');
      return;
    }
  }, [userProfile]);

  /* fetch on mount */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user && !cancelled) {''',
    content,
    flags=re.DOTALL
)

# Remove now-unneeded supabase import if no other usage remains (safe to leave)
with open(r'app\[locale]\dashboard\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("dashboard: done")
