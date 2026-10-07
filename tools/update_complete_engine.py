import os, json

with open('tools/generated_buildFullDataset.js', 'r', encoding='utf-8') as f:
    build_full_dataset_code = f.read()

# Read the current modulo-11-garden.js as a base template
with open('modulo-11-garden.js', 'r', encoding='utf-8') as f:
    js_code = f.read()

# Replace the DOM declaration section at the top to ensure all DOM elements are declared early
old_dom_start = '// ---- Setup de Escena, Cámara y Renderizador WebGL ----'
old_dom_end = 'const scene = new THREE.Scene();'

new_dom_section = """// ---- Setup de Escena, Cámara y Renderizador WebGL ----
  const canvas = document.getElementById("sceneCanvas");
  const loadingVeil = document.getElementById("loadingVeil");
  const topHeader = document.getElementById("topHeader");
  const sideDrawer = document.getElementById("sideDrawer");
  const nodeInspector = document.getElementById("nodeInspector");
  const chatWidgetBtn = document.getElementById("chatWidgetBtn");
  const faqChatModal = document.getElementById("faqChatModal");
  const subnetworkModal = document.getElementById("subnetworkModal");
  const toastNotify = document.getElementById("toastNotify");
  const waypointsBar = document.getElementById("waypointsBar");
  const activeTreeChip = document.getElementById("activeTreeChip");
  const activeTreeImg = document.getElementById("activeTreeImg");
  const activeTreeName = document.getElementById("activeTreeName");

  const slider = document.getElementById("experienceSlider");
  const btnToggle = document.getElementById("btnPlayTransition");
  const btnActionText = document.getElementById("btnActionText");
  const labelSwarm = document.getElementById("labelSwarm");
  const labelTerritory = document.getElementById("labelTerritory");

  const camInspectorBox = document.getElementById("camInspectorBox");
  const camCoordPos = document.getElementById("camCoordPos");
  const camCoordTarget = document.getElementById("camCoordTarget");
  const btnSaveCameraView = document.getElementById("btnSaveCameraView");
  const btnCloseCamInspector = document.getElementById("btnCloseCamInspector");
  const camToast = document.getElementById("camToast");"""

# Replace DOM section
pos_dom_start = js_code.find(old_dom_start)
pos_dom_end = js_code.find(old_dom_end)
if pos_dom_start != -1 and pos_dom_end != -1:
    js_code = js_code[:pos_dom_start] + new_dom_section + "\n\n  " + js_code[pos_dom_end:]

# Replace the dataset definition section
dataset_marker_start = '  function buildFull180Dataset() {'
dataset_marker_end = '  const fullTaxa = buildFull180Dataset();'

pos_ds_start = js_code.find(dataset_marker_start)
pos_ds_end = js_code.find(dataset_marker_end)

if pos_ds_start != -1 and pos_ds_end != -1:
    js_code = js_code[:pos_ds_start] + build_full_dataset_code + "\n\n  const fullTaxa = buildFullDataset();" + js_code[pos_ds_end + len(dataset_marker_end):]
else:
    print("Warning: dataset marker not found exactly, searching buildFullDataset")
    ds2_start = js_code.find('  function buildFullDataset() {')
    ds2_end = js_code.find('  const fullTaxa = buildFullDataset();')
    if ds2_start != -1 and ds2_end != -1:
        js_code = js_code[:ds2_start] + build_full_dataset_code + "\n\n  const fullTaxa = buildFullDataset();" + js_code[ds2_end + len(ds2_end):]

# Update optimized sampling in loadTrees and loadBuildings
load_trees_search = 'const list = Array.isArray(trees) ? trees : (trees.trees || []);'
load_trees_replace = 'const rawList = Array.isArray(trees) ? trees : (trees.trees || []);\n        const list = rawList.filter((_, idx) => idx % 4 === 0);'

load_bld_search = 'const bldList = Array.isArray(buildings) ? buildings : (buildings.buildings || []);'
load_bld_replace = 'const rawBldList = Array.isArray(buildings) ? buildings : (buildings.buildings || []);\n        const bldList = rawBldList.filter((_, idx) => idx % 8 === 0);'

if load_trees_search in js_code:
    js_code = js_code.replace(load_trees_search, load_trees_replace, 1)

if load_bld_search in js_code:
    js_code = js_code.replace(load_bld_search, load_bld_replace, 1)

with open('modulo-11-garden.js', 'w', encoding='utf-8') as out:
    out.write(js_code)
print("Updated modulo-11-garden.js successfully.")

# Now update modulo-11-garden.html and index.html
with open('modulo-11-garden.html', 'r', encoding='utf-8') as f:
    html_code = f.read()

# Update Aves badge in HTML
html_code = html_code.replace('>57 Especies Acuáticas & de Dosel<', '>248 Especies de Avifauna / iNaturalist Kennedy<')
html_code = html_code.replace('<span class="badge-count" id="badgeCat1" style="color:#38BDF8;">57</span>', '<span class="badge-count" id="badgeCat1" style="color:#38BDF8;">248</span>')
html_code = html_code.replace('31.5% (57)', '66.7% (248)')
html_code = html_code.replace('49.7% (90)', '24.2% (90)')
html_code = html_code.replace('(180 taxones)', '(372 taxones)')

# Replace inline script
script_start = html_code.find('<script>\n// =====================================================================\n// Sistema Socioecológico de Kennedy')
if script_start == -1:
    script_start = html_code.find('<script>\n// =====================================================================')

new_html = html_code[:script_start] + '<script>\n' + js_code + '\n</script>\n</body>\n</html>'

with open('modulo-11-garden.html', 'w', encoding='utf-8') as out:
    out.write(new_html)

with open('index.html', 'w', encoding='utf-8') as out:
    out.write(new_html)

print("Updated modulo-11-garden.html and index.html successfully.")
