import re

# ─── 5. SETTINGS ────────────────────────────────────────────────────────────────
with open(r'app\[locale]\settings\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
content = content.replace(
    'import React, { useEffect, useState } from "react";',
    'import React, { useEffect, useState } from "react";\nimport { useUser } from "@/contexts/UserContext";'
)

# Remove old local state for userRole and userName  
content = content.replace('  const [userRole, setUserRole] = useState<string | null>(null);\n', '')
content = content.replace('  const [userName, setUserName] = useState("");\n', '')

# Replace the old getUser useEffect that fetches profile
content = re.sub(
    r'  useEffect\(\(\) => \{\s*async function getUser\(\) \{\s*const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\);\s*if \(user\) \{\s*setEmail\(user\.email \|\| ""\);\s*const \{ data: profile \} = await supabase\s*\.from\("user_profiles"\)\s*\.select\("role, full_name"\)\s*\.eq\("id", user\.id\)\s*\.single\(\);\s*if \(profile\) \{\s*console\.log\("[^"]*"\);\s*setUserRole\(profile\.role\);\s*setUserName\(profile\.full_name \|\| ""\);\s*setEditName\(profile\.full_name \|\| ""\);\s*\}\s*\}\s*\}\s*getUser\(\);\s*\}, \[\]\);',
    '''  useEffect(() => {
    async function getEmail() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
      }
    }
    getEmail();
  }, []);''',
    content,
    flags=re.DOTALL
)

# Add useUser hook and derive editName initial value from context
content = content.replace(
    'function SettingsContent() {\n',
    'function SettingsContent() {\n  const { userProfile, setUserProfile } = useUser();\n  const userRole = userProfile?.role || null;\n  const userName = userProfile?.full_name || "";\n'
)

# Set editName from context on load
old_editname = '  const [editName, setEditName] = useState("");'
new_editname = '  const [editName, setEditName] = useState(userProfile?.full_name || "");'
content = content.replace(old_editname, new_editname)

# After successful save: call setUserProfile with updated row instead of setUserName
content = re.sub(
    r'console\.log\("\[DEBUG\] Settings save API response:", data, "\| Source: API update response"\);\s*\s*if \(error\) \{\s*setProfileMessage\(\{ type: "error", text: error\.message \}\);\s*\} else \{\s*setUserName\(editName\);\s*setProfileMessage\(\{ type: "success", text: "Profile updated successfully\." \}\);\s*\}',
    '''console.log("[DEBUG] Settings save API response:", data, "| Source: API update response");
        
        if (error) {
          setProfileMessage({ type: "error", text: error.message });
        } else {
          if (data && data[0]) {
            setUserProfile({ ...userProfile, ...data[0] });
          }
          setProfileMessage({ type: "success", text: "Profile updated successfully." });
        }''',
    content
)

with open(r'app\[locale]\settings\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("settings: done")
