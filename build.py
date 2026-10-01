# Gera index.html a partir de src/crm.template.html + src/leads.json
import json, pathlib
root = pathlib.Path(__file__).parent
data = json.loads((root / 'src/leads.json').read_text(encoding='utf-8'))
payload = json.dumps(data, ensure_ascii=False).replace('</', r'<\/')
html = (root / 'src/crm.template.html').read_text(encoding='utf-8').replace('/*__DATA__*/null', payload)
(root / 'index.html').write_text(html, encoding='utf-8')
print('index.html gerado:', len(html), 'bytes')
