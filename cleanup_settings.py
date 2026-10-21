import re

# The regex for the old getUser useEffect didn't fire (leftover from before our earlier edits).
# Let's just rewrite the top of SettingsContent cleanly.
with open(r'app\[locale]\settings\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the leftover old useEffect that still calls setUserRole / setUserName (removed vars)
content = re.sub(
    r'  useEffect\(\(\) => \{\s*async function getUser\(\) \{\s*const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\);\s*if \(user\) \{\s*setEmail\(user\.email \|\| ""\);\s*const \{ data: profile \} = await supabase\s*\.from\("user_profiles"\)\s*\.select\("role, full_name"\)\s*\.eq\("id", user\.id\)\s*\.single\(\);\s*if \(profile\) \{\s*console\.log\("[^"]*"\);\s*setUserRole\(profile\.role\);\s*setUserName\(profile\.full_name \|\| ""\);\s*setEditName\(profile\.full_name \|\| ""\);\s*\}\s*\}\s*\}\s*getUser\(\);\s*\}, \[\]\);',
    '''  useEffect(() => {
    async function getEmail() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email || "");
    }
    getEmail();
  }, []);

  // Sync editName whenever context loads / updates
  useEffect(() => {
    if (userProfile?.full_name) setEditName(userProfile.full_name);
  }, [userProfile?.full_name]);''',
    content,
    flags=re.DOTALL
)

with open(r'app\[locale]\settings\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("settings cleanup: done")
