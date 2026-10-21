import os

messages = {
    'messages/en.json': '{"test": "Hello"}',
    'messages/hi.json': '{"test": "नमस्ते"}',
    'messages/mr.json': '{"test": "नमस्कार"}'
}

for path, content in messages.items():
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
