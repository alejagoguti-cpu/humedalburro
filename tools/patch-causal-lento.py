#!/usr/bin/env python3
"""Aplica a red-causal-3n.html: movimiento ~8x mas lento + cero fotos.
Uso: python tools/patch-causal-lento.py [pagina.html]"""
import sys

PATH = sys.argv[1] if len(sys.argv) > 1 else 'red-causal-3n.html'

PATCHES = [
    # --- movimiento mucho mas lento ---
    ("networkGroup.rotation.y += delta * 0.12;",
     "networkGroup.rotation.y += delta * 0.015;"),
    ("controls.autoRotateSpeed = 0.18;",
     "controls.autoRotateSpeed = 0.02;"),
    ("""n.x + Math.sin(t * 0.85 + ph) * 0.55,""",
     """n.x + Math.sin(t * 0.1 + ph) * 0.25,"""),
    ("""n.y + Math.cos(t * 0.7 + ph * 1.31) * 0.55,""",
     """n.y + Math.cos(t * 0.08 + ph * 1.31) * 0.25,"""),
    ("""n.z + Math.sin(t * 0.6 + ph * 0.77) * 0.55""",
     """n.z + Math.sin(t * 0.07 + ph * 0.77) * 0.25"""),
    ("const s = 1 + Math.sin(t * 0.9) * 0.014;",
     "const s = 1 + Math.sin(t * 0.1) * 0.006;"),
    ("const sc = 1.0 + Math.sin(elapsedTime * 2.5 + idx) * 0.15;",
     "const sc = 1.0 + Math.sin(elapsedTime * 0.3 + idx) * 0.08;"),
    ("s.x + Math.sin(tt * 0.9 + k * 1.7) * 2.2, y: s.y + Math.cos(tt * 0.75 + k * 1.3) * 2.2",
     "s.x + Math.sin(tt * 0.12 + k * 1.7) * 1.0, y: s.y + Math.cos(tt * 0.1 + k * 1.3) * 1.0"),
    ("Math.sin(tt * 2 + k) * 2",
     "Math.sin(tt * 0.25 + k) * 1"),
    # --- cero fotos ---
    ("photoUrl: tData.img || generateSpeciesSvgDataUri(tData.id, tData.name, tData.cat),",
     "photoUrl: tData.img || generateSpeciesSvgDataUri(tData.id, tData.name, tData.cat),\n      hasPhoto: !!tData.img,"),
    ("""imgEl.style.display = "block";
      imgEl.src = n.photoUrl;
      imgEl.onerror = () => { imgEl.style.display = "none"; };""",
     """if (n.hasPhoto) {
        imgEl.style.display = "block";
        imgEl.src = n.photoUrl;
        imgEl.onerror = () => { imgEl.style.display = "none"; };
      } else {
        imgEl.style.display = "none";
      }"""),
    ("""<img class="hub-img" src="${n.photoUrl || ''}" onerror="this.src='./assets/inat_sauco.png'" alt="${n.label}">""",
     """${n.hasPhoto ? '<img class="hub-img" src="' + n.photoUrl + '" alt="' + n.label + '">' : '<span class="hub-img" style="display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);"><i class="fa-solid ' + (n.icon || 'fa-circle-nodes') + '" style="color:' + catHex + ';font-size:18px;"></i></span>'}"""),
    ("if (modalImg) modalImg.src = t.img || generateSpeciesSvgDataUri(t.id, t.name, t.cat);",
     'if (modalImg) { if (t.img) { modalImg.style.display = ""; modalImg.src = t.img; } else { modalImg.style.display = "none"; } }'),
    ("if (ttImg) ttImg.src = t.img || generateSpeciesSvgDataUri(t.id, t.name, t.cat);",
     'if (ttImg) { if (t.img) { ttImg.style.display = ""; ttImg.src = t.img; } else { ttImg.style.display = "none"; } }'),
]

with open(PATH, 'r', encoding='utf-8', newline='') as f:
    raw = f.read()
ENDING = '\r\n' if '\r\n' in raw else '\n'
html = raw.replace('\r\n', '\n')

for i, (old, new) in enumerate(PATCHES):
    n = html.count(old)
    if n != 1:
        print(f'PATCH {i}: ENCONTRADO {n} VECES (se esperaba 1) -> {old[:70]!r}')
        sys.exit(1)
    html = html.replace(old, new)

with open(PATH, 'w', encoding='utf-8', newline='') as f:
    f.write(html.replace('\n', ENDING))
print(f'OK: {len(PATCHES)} parches aplicados a {PATH}')
