import re

with open('app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure we add import FaqAccordion from "@/components/FaqAccordion";
if 'import FaqAccordion' not in content:
    content = content.replace('import Link from "next/link";', 'import Link from "next/link";\\nimport FaqAccordion from "@/components/FaqAccordion";')

# Replace the specific block
start_str = '<div className="mt-12 flex flex-col gap-4">'
end_str = '            </div>\\n          </div>\\n        </section>'
start_idx = content.find(start_str)
if start_idx != -1:
    end_idx = content.find(end_str, start_idx) + len('            </div>')
    content = content[:start_idx] + '<div className="mt-12">\\n              <FaqAccordion />\\n            </div>' + content[end_idx:]

with open('app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
