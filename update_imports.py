import os
import glob
import re

files = glob.glob('app/**/*.tsx', recursive=True) + glob.glob('components/**/*.tsx', recursive=True)

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Link replacement
    content = re.sub(r'import Link from "next/link";', 'import { Link } from "@/i18n/routing";', content)

    # Navigation replacement
    if 'import { useRouter, useSearchParams } from "next/navigation";' in content:
        content = content.replace('import { useRouter, useSearchParams } from "next/navigation";', 'import { useSearchParams } from "next/navigation";\nimport { useRouter } from "@/i18n/routing";')
    elif 'import { useRouter } from "next/navigation";' in content:
        content = content.replace('import { useRouter } from "next/navigation";', 'import { useRouter } from "@/i18n/routing";')
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
