import re
import os

target_files = [
    'app/screening/page.tsx',
    'app/dashboard/[id]/page.tsx',
    'app/settings/page.tsx',
    'app/help/page.tsx',
    'app/page.tsx',
    'app/login/page.tsx',
    'app/signup/page.tsx',
    'app/forgot-password/page.tsx',
    'app/reset-password/page.tsx'
]

def apply_dark_classes(match):
    prefix = match.group(1)
    classes_str = match.group(2)
    suffix = match.group(3)
    
    classes = classes_str.split(' ')
    new_classes = []
    
    mappings = {
        'bg-slate-50': 'dark:bg-slate-950',
        'bg-slate-50/50': 'dark:bg-slate-950/50',
        'bg-slate-100': 'dark:bg-slate-800',
        'bg-slate-200': 'dark:bg-slate-800',
        'bg-white': 'dark:bg-slate-900',
        
        'border-slate-100': 'dark:border-slate-800',
        'border-slate-200': 'dark:border-slate-800',
        'border-slate-300': 'dark:border-slate-700',
        'border-slate-400': 'dark:border-slate-600',
        
        'text-slate-900': 'dark:text-slate-50',
        'text-slate-800': 'dark:text-slate-200',
        'text-slate-700': 'dark:text-slate-200',
        'text-slate-600': 'dark:text-slate-300',
        'text-slate-500': 'dark:text-slate-400',
        'text-slate-400': 'dark:text-slate-500',
        
        'hover:bg-slate-50': 'dark:hover:bg-slate-800',
        'hover:bg-slate-100': 'dark:hover:bg-slate-700',
        'hover:text-slate-900': 'dark:hover:text-slate-50',
        'hover:text-slate-800': 'dark:hover:text-slate-200',
        'hover:text-slate-700': 'dark:hover:text-slate-200',
        'hover:text-slate-600': 'dark:hover:text-slate-300',
        
        'divide-slate-100': 'dark:divide-slate-800',
        'divide-slate-200': 'dark:divide-slate-700',
        
        'bg-sky-50': 'dark:bg-sky-900/30',
        'bg-sky-100': 'dark:bg-sky-900/50',
        'bg-sky-600': 'dark:bg-sky-700', # For things like solid buttons or user chat bubbles
        'text-sky-500': 'dark:text-sky-400',
        'text-sky-600': 'dark:text-sky-400',
        'text-sky-700': 'dark:text-sky-400',
        'hover:text-sky-600': 'dark:hover:text-sky-400',
        'hover:text-sky-700': 'dark:hover:text-sky-400',
        'focus:border-sky-500': 'dark:focus:border-sky-400',
        'focus:ring-sky-500': 'dark:focus:ring-sky-400',
        'hover:bg-sky-700': 'dark:hover:bg-sky-600',
        
        'text-red-500': 'dark:text-red-400',
        'text-red-600': 'dark:text-red-400',
        'text-red-700': 'dark:text-red-400',
        'text-red-800': 'dark:text-red-300',
        'bg-red-50': 'dark:bg-red-900/30',
        'bg-red-100': 'dark:bg-red-900/50',
        'border-red-200': 'dark:border-red-800',
        'border-red-300': 'dark:border-red-700',
        
        'text-amber-500': 'dark:text-amber-400',
        'text-amber-600': 'dark:text-amber-400',
        'text-amber-700': 'dark:text-amber-400',
        'text-amber-800': 'dark:text-amber-300',
        'text-amber-900': 'dark:text-amber-300',
        'bg-amber-50': 'dark:bg-amber-900/30',
        'bg-amber-100': 'dark:bg-amber-900/50',
        'border-amber-200': 'dark:border-amber-800',
        'border-amber-300': 'dark:border-amber-700',
        
        'text-emerald-500': 'dark:text-emerald-400',
        'text-emerald-600': 'dark:text-emerald-400',
        'text-emerald-700': 'dark:text-emerald-400',
        'text-emerald-800': 'dark:text-emerald-300',
        'hover:text-emerald-700': 'dark:hover:text-emerald-400',
        'bg-emerald-50': 'dark:bg-emerald-900/30',
        'bg-emerald-100': 'dark:bg-emerald-900/50',
        'border-emerald-200': 'dark:border-emerald-800',
        'border-emerald-300': 'dark:border-emerald-700',
        
        'placeholder-slate-400': 'dark:placeholder-slate-400',
        'placeholder-slate-500': 'dark:placeholder-slate-400',
        
        # Form elements
        'bg-white/50': 'dark:bg-slate-900/50',
        'bg-white/80': 'dark:bg-slate-900/80',
    }
    
    for cls in classes:
        cls_clean = cls.strip()
        new_classes.append(cls)
        if cls_clean in mappings:
            if mappings[cls_clean] not in classes_str:
                new_classes.append(mappings[cls_clean])
                
    return prefix + ' '.join(new_classes) + suffix

for filepath in target_files:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        new_content = re.sub(r'(className=")([^"]*)(")', apply_dark_classes, content)
        new_content = re.sub(r'(className=\{\x60)([^\x60]*)(\x60\})', apply_dark_classes, new_content)
        new_content = re.sub(r'(cls:\s*")([^"]*)(")', apply_dark_classes, new_content)

        # Let's ensure form inputs inherently get bg-white and text-slate-900 if they don't have it, so dark classes map properly.
        # Actually, running the regex is fine if they already have bg-white or similar. If not, they'll be missed.
        # Let's just run it first and then check specific files.

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")
