import re

file_path = r'app\[locale]\settings\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Modify handleSaveProfile
old_update = '''        const { error } = await supabase
          .from("user_profiles")
          .update({ full_name: editName })
          .eq("id", user.id);'''

new_update = '''        const { data, error } = await supabase
          .from("user_profiles")
          .update({ full_name: editName })
          .eq("id", user.id)
          .select();
        
        console.log("[DEBUG] Settings save API response:", data, "| Source: API update response");'''

if old_update in content:
    content = content.replace(old_update, new_update)
else:
    print("Warning: old_update not found in settings")

# Add log on initial load in settings
old_load = '''          if (profile) {
            setUserRole(profile.role);
            setUserName(profile.full_name || "");
            setEditName(profile.full_name || "");
          }'''

new_load = '''          if (profile) {
            console.log("[DEBUG] Loaded profile in Settings:", profile.full_name, "| Source: API select user_profiles");
            setUserRole(profile.role);
            setUserName(profile.full_name || "");
            setEditName(profile.full_name || "");
          }'''

if old_load in content:
    content = content.replace(old_load, new_load)
else:
    print("Warning: old_load not found in settings")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated settings/page.tsx")
