import re

with open('app/my-results/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

stat_card = """
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-2">
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
"""

if "function StatCard" not in content:
    content = content.replace('function formatDate(iso: string): string {', stat_card + '\nfunction formatDate(iso: string): string {')

render_stats = """
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Total Screenings" value={screenings.length} />
              <StatCard label="Latest Risk Level" value={screenings.length > 0 ? riskBadge(riskPercent(screenings[0])).label : "--"} />
              <StatCard label="Latest Result Date" value={screenings.length > 0 ? formatDate(screenings[0].created_at) : "--"} />
            </div>
            
            <div className="flex flex-col gap-4">
"""

# Replace /* results list */\n          <div className="flex flex-col gap-4">
content = content.replace('/* results list */\n          <div className="flex flex-col gap-4">', '/* results list */' + render_stats)
# Replace matching closing div block
# Wait, let's just use string replacement carefully
content = content.replace('      </div>\n        )\n      </div>\n    </div>\n  );\n}', '      </div>\n          </div>\n        )\n      </div>\n    </div>\n  );\n}')

# Actually, let's do precise regex or explicit string replacement for the closing tag
old_bottom = """
              );
            })}
          </div>
        )}
      </main>
"""
new_bottom = """
              );
            })}
          </div>
          </div>
        )}
      </main>
"""
if "</div>\n          </div>\n        )}\n      </main>" not in content:
    content = content.replace(old_bottom, new_bottom)

with open('app/my-results/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

