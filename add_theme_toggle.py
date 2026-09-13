import os
import re

target_dir = 'app'

# Search for the user card block
card_pattern = re.compile(
    r'<div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">'
)

def replace_in_file(filepath):
    # Only process pages
    if not filepath.endswith('page.tsx'):
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Check if it has a sidebar by looking for the user card pattern
    if card_pattern.search(content):
        # Insert import if missing
        if 'import ThemeToggle' not in content:
            # try finding import Image or import Link
            if 'import Image from "next/image";' in content:
                content = content.replace('import Image from "next/image";', 'import Image from "next/image";\nimport ThemeToggle from "@/components/ThemeToggle";')
            elif 'import Link from "next/link";' in content:
                content = content.replace('import Link from "next/link";', 'import Link from "next/link";\nimport ThemeToggle from "@/components/ThemeToggle";')
            else:
                content = 'import ThemeToggle from "@/components/ThemeToggle";\n' + content
        
        # Inject ThemeToggle above the user card
        replacement = """<div className="flex items-center justify-between px-2 pb-2">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Theme</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">"""
          
        content = card_pattern.sub(replacement, content)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Added ThemeToggle to {filepath}")

for root, _, files in os.walk(target_dir):
    for f in files:
        if f.endswith('.tsx'):
            replace_in_file(os.path.join(root, f))
