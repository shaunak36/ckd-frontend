import re

# The old useEffect still references setUserRole/setUserName which no longer exist as state setters.
# We need to fully replace it since it wasn't matched by previous regex (indentation difference).
with open(r'app\[locale]\settings\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the stubborn old useEffect
old = '''  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .single();
        if (profile) {
            console.log("[DEBUG] Loaded profile in Settings:", profile.full_name, "| Source: API select user_profiles");
            setUserRole(profile.role);
            setUserName(profile.full_name || "");
            setEditName(profile.full_name || "");
          }
      }
    }
    getUser();
  }, []);'''

new = '''  useEffect(() => {
    async function getEmail() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email || "");
    }
    getEmail();
  }, []);

  // Sync editName whenever context loads / updates
  useEffect(() => {
    if (userProfile?.full_name) setEditName(userProfile.full_name);
  }, [userProfile?.full_name]);'''

if old in content:
    content = content.replace(old, new)
    print("Replaced old useEffect")
else:
    print("WARNING: old useEffect not found verbatim, check manually")

with open(r'app\[locale]\settings\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("settings final cleanup: done")
