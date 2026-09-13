import re

with open('app/dashboard/[id]/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix top wrappers
content = content.replace(
    '''      {/* Main Content */}
      <main className="ml-64 flex w-full flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10 sm:px-8">''',
    '''      {/* Main Content Area */}
      <div className="flex flex-1 flex-col pl-64">
        <main className="flex-1 p-8">
          <div className="flex flex-col gap-8">'''
)

# Fix bottom wrappers
content = content.replace(
    '''        })()}
      </div>
      </main>
    </div>
  );
}''',
    '''        })()}
          </div>
        </main>
      </div>
    </div>
  );
}'''
)

with open('app/dashboard/[id]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
