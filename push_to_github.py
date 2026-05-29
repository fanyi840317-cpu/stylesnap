"""Push all files to GitHub using Contents API."""
import json, subprocess, base64, urllib.request, os

TOKEN = 'YOUR_GITHUB_TOKEN'
REPO = 'fanyi840317-cpu/stylesnap'
API = f'https://api.github.com/repos/{REPO}/contents'
HEADERS = {
    'Authorization': f'token {TOKEN}',
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json'
}

def api_call(method, path, data=None):
    url = f'{API}/{path}'
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.request.HTTPError as e:
        return json.loads(e.read())

# Get list of files
result = subprocess.run(['git', 'ls-tree', '-r', 'HEAD'], capture_output=True, text=True, cwd='D:/code/stylesnap')
files = []
for line in result.stdout.strip().split('\n'):
    parts = line.split('\t')
    path = parts[1]
    files.append(path)

print(f'Uploading {len(files)} files...')

for i, filepath in enumerate(files):
    full_path = os.path.join('D:/code/stylesnap', filepath.replace('/', os.sep))
    
    with open(full_path, 'rb') as f:
        content = base64.b64encode(f.read()).decode()
    
    data = {
        'message': f'feat: add {filepath}',
        'content': content,
        'branch': 'main'
    }
    
    resp = api_call('PUT', filepath, data)
    status = 'OK' if 'content' in resp else resp.get('message', 'ERROR')
    print(f'[{i+1}/{len(files)}] {filepath}: {status}')

print('Done!')
