import re

file_path = r'app\[locale]\screening\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'(const \{ data: profile \} = await supabase\s*\.from\("user_profiles"\)\s*\.select\("role, full_name"\)\s*\.eq\("id", user\.id\)\s*\.single\(\);)',
    r'\1\n          console.log("[DEBUG] Loaded profile in Screening:", profile?.full_name, "| Source: API select user_profiles");',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated screening/page.tsx")
