import re

with open('app/my-results/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_str = """
              );
            })}
          </div>
        )}
        </main>
"""
new_str = """
              );
            })}
          </div>
          </div>
        )}
        </main>
"""
content = content.replace(old_str, new_str)

with open('app/my-results/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
