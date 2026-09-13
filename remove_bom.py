import os

with open('app/globals.css', 'r', encoding='utf-8') as f:
    content = f.read().lstrip('\ufeff')

with open('app/globals.css', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
