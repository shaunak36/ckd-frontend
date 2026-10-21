import os
import glob
files = glob.glob('app/**/*.tsx', recursive=True) + glob.glob('components/**/*.tsx', recursive=True)
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
        if 'user_profiles' in content:
            print(f"Found user_profiles in {f}")
