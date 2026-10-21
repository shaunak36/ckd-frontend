import re
import glob

files = glob.glob(r'app\[locale]\**\page.tsx', recursive=True)
for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if '.from("user_profiles")' in content or ".from('user_profiles')" in content:
        # We will add a console log after the single() call if it has a profile
        if 'if (profile?.full_name)' in content or 'if (profile)' in content:
            # Let's replace 'if (profile?.full_name) {' or 'if (profile) {'
            pass

