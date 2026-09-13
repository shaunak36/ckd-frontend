import re

with open('app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_str = '<div className="mt-12 flex flex-col gap-4">'
end_str = '            </div>\n          </div>\n        </section>'

start_idx = content.find(start_str)
end_idx = content.find(end_str, start_idx)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + '<div className="mt-12">\n              <FaqAccordion />\n' + content[end_idx:]

with open('app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
