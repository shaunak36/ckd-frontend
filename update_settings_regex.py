import re

file_path = r'app\[locale]\settings\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace update
content = re.sub(
    r'(const \{ error \} = await supabase\s*\.from\("user_profiles"\)\s*\.update\(\{ full_name: editName \}\)\s*\.eq\("id", user\.id\);)',
    r'const { data, error } = await supabase\n          .from("user_profiles")\n          .update({ full_name: editName })\n          .eq("id", user.id)\n          .select();\n        console.log("[DEBUG] Settings save API response:", data, "| Source: API update response");',
    content
)

# Replace load
content = re.sub(
    r'(if \(profile\) \{\s*setUserRole\(profile\.role\);\s*setUserName\(profile\.full_name \|\| ""\);\s*setEditName\(profile\.full_name \|\| ""\);\s*\})',
    r'if (profile) {\n            console.log("[DEBUG] Loaded profile in Settings:", profile.full_name, "| Source: API select user_profiles");\n            setUserRole(profile.role);\n            setUserName(profile.full_name || "");\n            setEditName(profile.full_name || "");\n          }',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated settings/page.tsx")
