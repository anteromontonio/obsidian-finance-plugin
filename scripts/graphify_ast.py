import json
from graphify.extract import collect_files, extract
from pathlib import Path

detect = json.loads(Path('.graphify_detect.json').read_text())
code_files = []
for f in detect.get('files', {}).get('code', []):
    p = Path(f)
    code_files.extend(collect_files(p) if p.is_dir() else [p])

result = extract(code_files)
Path('.graphify_ast.json').write_text(json.dumps(result, indent=2))
# AST only, skip semantic for code-only corpus
Path('.graphify_semantic.json').write_text(json.dumps({'nodes':[],'edges':[],'hyperedges':[]}))
# Merge
merged = {
    'nodes': result['nodes'],
    'edges': result['edges'],
    'hyperedges': [],
    'input_tokens': 0,
    'output_tokens': 0,
}
Path('.graphify_extract.json').write_text(json.dumps(merged, indent=2))
print(f"AST: {len(result['nodes'])} nodes, {len(result['edges'])} edges")
