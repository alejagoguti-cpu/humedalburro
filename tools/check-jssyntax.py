import re, subprocess
import esprima

old = subprocess.run(['git', 'show', 'HEAD:red-causal-3n.html'], capture_output=True).stdout.decode('utf-8')
new = open('red-causal-3n.html', encoding='utf-8').read()

def scripts(html):
    return re.findall(r'<script(?![^>]*src=)[^>]*>(.*?)</script>', html, re.S)

def errs(code):
    out = []
    try:
        esprima.parseScript(code)
    except Exception as e:
        out.append(f'{getattr(e, "lineNumber", "?")}:{getattr(e, "column", "?")} {e}')
    return out

for name, html in (('HEAD', old), ('WORK', new)):
    blocks = scripts(html)
    print(name, 'bloques:', len(blocks))
    for i, b in enumerate(blocks):
        e = errs(b)
        print(f'  bloque {i} len={len(b)} errores={e if e else "NINGUNO"}')
