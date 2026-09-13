import re

with open('app/layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the broken script tag block with the correct one
broken = """<head>\\n        <script
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

fixed = """<head>
        <script
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

content = content.replace(broken, fixed)

with open('app/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
