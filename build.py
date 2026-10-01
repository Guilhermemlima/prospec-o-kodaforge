# Gera, a partir de src/crm.template.html + src/leads.json:
#   index.html           -> versão web (Vercel), tudo num arquivo só
#   extension/crm.html   -> CRM completo dentro da extensão do Chrome
#   extension/panel.html -> painel lateral ao lado do WhatsApp Web
# (extensões do Chrome não aceitam <script> embutido, por isso o JS vai em arquivos separados)
import json, pathlib, re
root = pathlib.Path(__file__).parent
ext = root / 'extension'

data = json.loads((root / 'src/leads.json').read_text(encoding='utf-8'))
payload = json.dumps(data, ensure_ascii=False).replace('</', r'<\/')
tpl = (root / 'src/crm.template.html').read_text(encoding='utf-8')

html = tpl.replace('/*__DATA__*/null', payload)
(root / 'index.html').write_text(html, encoding='utf-8')
print('index.html:', len(html), 'bytes')

m = re.search(r'<script>\n(const DATA = /\*__DATA__\*/null;.*?)</script>', tpl, re.S)
app_js = m.group(1).replace('/*__DATA__*/null', 'window.KODA_DATA')
(ext / 'crm.js').write_text(app_js, encoding='utf-8')
(ext / 'data.js').write_text('window.KODA_DATA = ' + payload + ';\n', encoding='utf-8')
for name, extra in [('crm.html', ''), ('panel.html', '<script src="panel-mode.js"></script>')]:
    page = tpl[:m.start()] + extra + '<script src="data.js"></script><script src="crm.js"></script>' + tpl[m.end():]
    (ext / name).write_text(page, encoding='utf-8')
print('extension/: crm.html, panel.html, crm.js, data.js')

icons = ext / 'icons'
if not (icons / '128.png').exists():
    from PIL import Image, ImageDraw, ImageFont
    icons.mkdir(exist_ok=True)
    for size in (16, 48, 128):
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle((0, 0, size - 1, size - 1), radius=size // 5, fill=(31, 122, 90))
        try:
            font = ImageFont.truetype('arialbd.ttf', int(size * 0.62))
        except OSError:
            font = ImageFont.load_default()
        d.text((size / 2, size / 2), 'K', font=font, fill='white', anchor='mm')
        img.save(icons / f'{size}.png')
    print('ícones gerados')
