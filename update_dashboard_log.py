import re

file_path = r'app\[locale]\dashboard\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'(const \{ data: profile \} = await supabase\.from\(\'user_profiles\'\)\.select\(\'full_name, role\'\)\.eq\(\'id\', user\.id\)\.single\(\);)',
    r'\1\n            console.log("[DEBUG] Loaded profile in Dashboard:", profile?.full_name, "| Source: API select user_profiles");',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated dashboard/page.tsx")
