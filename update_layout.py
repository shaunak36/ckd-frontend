import re

with open('app/layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

script_tag = """<script
          dangerouslySetInnerHTML={{
            __html: 
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            ,
          }}
        />"""

# Insert right after <head>
content = content.replace('<head>', f'<head>\\n        {script_tag}')

# Also we need to add suppressHydrationWarning to <html> otherwise Next.js will complain that the class attribute doesn't match the server
content = content.replace('<html', '<html suppressHydrationWarning')

with open('app/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
