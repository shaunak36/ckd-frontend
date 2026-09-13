import re

def apply_dark_classes(match):
    prefix = match.group(1)
    classes_str = match.group(2)
    suffix = match.group(3)
    
    classes = classes_str.split(' ')
    new_classes = []
    
    mappings = {
        'bg-slate-50': 'dark:bg-slate-950',
        'bg-slate-50/50': 'dark:bg-slate-950/50',
        'bg-white': 'dark:bg-slate-900',
        
        'border-slate-100': 'dark:border-slate-800',
        'border-slate-200': 'dark:border-slate-800',
        'border-slate-300': 'dark:border-slate-700',
        
        'text-slate-900': 'dark:text-slate-50',
        'text-slate-700': 'dark:text-slate-200',
        'text-slate-600': 'dark:text-slate-300',
        'text-slate-500': 'dark:text-slate-400',
        'text-slate-400': 'dark:text-slate-500',
        
        'hover:bg-slate-50': 'dark:hover:bg-slate-800',
        'hover:text-slate-900': 'dark:hover:text-slate-50',
        'hover:text-slate-700': 'dark:hover:text-slate-200',
        'hover:text-slate-600': 'dark:hover:text-slate-300',
        
        'divide-slate-100': 'dark:divide-slate-800',
        
        'bg-sky-50': 'dark:bg-sky-900/30',
        'bg-sky-100': 'dark:bg-sky-900/50',
        'text-sky-600': 'dark:text-sky-400',
        'text-sky-700': 'dark:text-sky-400',
        'hover:text-sky-600': 'dark:hover:text-sky-400',
        'hover:text-sky-700': 'dark:hover:text-sky-400',
        'focus:border-sky-500': 'dark:focus:border-sky-400',
        'focus:ring-sky-500': 'dark:focus:ring-sky-400',
        
        'text-red-600': 'dark:text-red-400',
        'text-red-700': 'dark:text-red-400',
        'text-red-800': 'dark:text-red-300',
        'bg-red-50': 'dark:bg-red-900/30',
        'border-red-200': 'dark:border-red-800',
        
        'text-amber-600': 'dark:text-amber-400',
        'bg-amber-50': 'dark:bg-amber-900/30',
        'border-amber-200': 'dark:border-amber-800',
        
        'text-emerald-600': 'dark:text-emerald-400',
        'text-emerald-700': 'dark:text-emerald-400',
        'hover:text-emerald-700': 'dark:hover:text-emerald-400',
        'bg-emerald-50': 'dark:bg-emerald-900/30',
        'border-emerald-200': 'dark:border-emerald-800',
    }
    
    for cls in classes:
        cls_clean = cls.strip()
        new_classes.append(cls)
        if cls_clean in mappings:
            if mappings[cls_clean] not in classes_str:
                new_classes.append(mappings[cls_clean])
                
    return prefix + ' '.join(new_classes) + suffix

with open('app/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_content = re.sub(r'(className=")([^"]*)(")', apply_dark_classes, content)

# Instead of using backticks in regex string (which powershell escapes), we can use \x60 for backtick
new_content = re.sub(r'(className=\{\x60)([^\x60]*)(\x60\})', apply_dark_classes, new_content)

with open('app/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
