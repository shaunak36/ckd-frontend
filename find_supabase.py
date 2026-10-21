import glob
files = glob.glob('app/**/*.tsx', recursive=True)
for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        if 'supabase.from' in f.read():
            print(file_path)
