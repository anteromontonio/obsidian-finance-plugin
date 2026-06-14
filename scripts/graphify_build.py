import json
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json, to_html
from pathlib import Path

extraction = json.loads(Path('.graphify_extract.json').read_text())
detection  = json.loads(Path('.graphify_detect.json').read_text())

G = build_from_json(extraction)
communities = cluster(G)
cohesion = score_all(G, communities)
tokens = {'input': 0, 'output': 0}
gods = god_nodes(G)
surprises = surprising_connections(G, communities)
labels_placeholder = {cid: f'Community {cid}' for cid in communities}
questions = suggest_questions(G, communities, labels_placeholder)

analysis = {
    'communities': {str(k): v for k, v in communities.items()},
    'cohesion': {str(k): v for k, v in cohesion.items()},
    'gods': gods,
    'surprises': surprises,
    'questions': questions,
}
Path('.graphify_analysis.json').write_text(json.dumps(analysis, indent=2))
to_json(G, communities, 'graphify-out/graph.json')

labels = {}
for cid, nodes in communities.items():
    sample = ', '.join(str(n) for n in nodes[:3])
    labels[cid] = sample[:50]
    print(f"  C{cid}: {sample[:70]}")

Path('.graphify_labels.json').write_text(json.dumps({str(k): v for k, v in labels.items()}))

report = generate(G, communities, cohesion, labels, gods, surprises, detection, tokens, 'src', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report)

to_html(G, communities, 'graphify-out/graph.html', community_labels=labels)
print("graph.html written to graphify-out/graph.html")
