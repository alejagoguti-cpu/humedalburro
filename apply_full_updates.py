import re

with open('template_garden.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. ADD CSS FOR HUBS MODAL AND IMPROVE SUBNETWORK / TOOLTIP CSS
extra_css = """
  /* Hubs (Especies Clave) Modal */
  .hubs-modal {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 860px; max-width: 95vw; height: 600px; max-height: 88vh; background: #050505;
    backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
    border: 1.5px solid #E7C878; box-shadow: 0 30px 90px #000000;
    border-radius: 14px; z-index: 310; display: flex; flex-direction: column;
    pointer-events: auto; overflow: hidden; animation: fadeIn 0.2s ease-out;
  }
  .hubs-header {
    padding: 14px 20px; background: #0a0a0c; border-bottom: 1px solid rgba(231, 200, 120, 0.25);
    display: flex; align-items: center; justify-content: space-between;
  }
  .hubs-body {
    flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 8px;
    background: rgba(6, 9, 15, 0.95);
  }
  .hub-card {
    background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;
    transition: all 0.2s ease; gap: 12px;
  }
  .hub-card:hover {
    background: rgba(15, 23, 42, 0.95); border-color: rgba(231, 200, 120, 0.45);
    transform: translateX(4px);
  }
  .hub-rank {
    width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 11px; flex-shrink: 0; background: rgba(255, 255, 255, 0.08); color: #cbd5e1;
  }
  .hub-rank.rank-1 { background: #E7C878; color: #000; box-shadow: 0 0 12px rgba(231, 200, 120, 0.6); }
  .hub-rank.rank-2 { background: #cbd5e1; color: #000; }
  .hub-rank.rank-3 { background: #D1A996; color: #000; }
  .hub-img {
    width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--cat-color, #84a48b);
    flex-shrink: 0;
  }
  .hub-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .hub-title { font-weight: 800; font-size: 12px; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hub-sci { font-size: 10px; color: #94a3b8; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hub-chips { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 2px; }
  .hub-chip {
    font-size: 8.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px;
    background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .hub-btn {
    background: rgba(231, 200, 120, 0.2); border: 1px solid #E7C878; color: #ffffff;
    font-weight: 700; font-size: 10px; padding: 6px 12px; border-radius: 6px; cursor: pointer;
    transition: all 0.2s; white-space: nowrap; display: flex; align-items: center; gap: 4px;
  }
  .hub-btn:hover { background: #E7C878; color: #000000; box-shadow: 0 0 12px rgba(231, 200, 120, 0.5); }
"""

# Replace in style tag
if '/* Hubs (Especies Clave) Modal */' not in content:
    content = content.replace('/* Subnetwork Modal */', extra_css + '\n  /* Subnetwork Modal */')

# Update subnetwork modal CSS dimensions
content = re.sub(
    r'\.subnetwork-modal\s*\{[^}]*\}',
    """.subnetwork-modal {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 860px; max-width: 95vw; height: 580px; max-height: 90vh; background: #050505;
    backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
    border: 1.5px solid #84A48B; box-shadow: 0 30px 80px #000000;
    border-radius: 12px; z-index: 300; display: flex; flex-direction: column;
    pointer-events: auto; overflow: hidden; animation: fadeIn 0.2s ease-out;
  }""",
    content
)

# 2. TOP HEADER BUTTON FOR HUBS
hub_btn_html = """    <button class="glass-panel btn-flat" id="btnHubsModal" onclick="openHubsModal()" style="color:#E7C878; border-color:rgba(231,200,120,0.35); background:rgba(231,200,120,0.12);">
      <i class="fa-solid fa-star" style="color:#E7C878;"></i>
      <span>Especies Clave (Hubs)</span>
    </button>
"""

if 'id="btnHubsModal"' not in content:
    content = content.replace(
        '<button class="glass-panel btn-flat active" onclick="openWelcomeModal()">',
        hub_btn_html + '    <button class="glass-panel btn-flat active" onclick="openWelcomeModal()">'
    )

# 3. HUBS MODAL AND SUBNETWORK MARKUP
hubs_modal_html = """<!-- Hubs (Especies Clave) Modal -->
<div class="hubs-modal" id="hubsModal" style="display:none;">
  <div class="hubs-header">
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="font-weight:800; font-size:13px; color:#E7C878;">⭐ Especies Clave & Hubs de Conectividad Biótica</span>
      <span style="font-size:10px; color:#94a3b8; font-family:monospace;">[Sabana de Bogotá · JBB · SIGAU · iNaturalist]</span>
    </div>
    <div class="btn-close" onclick="closeHubsModal()">×</div>
  </div>
  <div style="padding:8px 16px; background:rgba(15,23,42,0.8); display:flex; gap:6px; flex-wrap:wrap; border-bottom:1px solid rgba(255,255,255,0.08);">
    <button class="btn-flat active" id="hubFilterAll" onclick="filterHubs('all')">Todas (583)</button>
    <button class="btn-flat" id="hubFilterFlora" onclick="filterHubs(0)">Flora SIGAU</button>
    <button class="btn-flat" id="hubFilterAves" onclick="filterHubs(1)">Aves</button>
    <button class="btn-flat" id="hubFilterMam" onclick="filterHubs(2)">Mamíferos</button>
    <button class="btn-flat" id="hubFilterMol" onclick="filterHubs(3)">Moluscos</button>
    <button class="btn-flat" id="hubFilterAnf" onclick="filterHubs(4)">Anfibios</button>
    <button class="btn-flat" id="hubFilterRep" onclick="filterHubs(5)">Reptiles</button>
  </div>
  <div class="hubs-body" id="hubsList"></div>
</div>
"""

if 'id="hubsModal"' not in content:
    content = content.replace(
        '<!-- Sub-Network 2D Graph Interactive Modal Popup -->',
        hubs_modal_html + '\n<!-- Sub-Network 2D Graph Interactive Modal Popup -->'
    )

# Also enhance subnetwork modal with bottom rationale bar
if 'id="subHoverRationale"' not in content:
    content = content.replace(
        '  <div class="subnetwork-canvas-wrap">\n    <canvas id="subCanvas"></canvas>\n  </div>',
        '  <div class="subnetwork-canvas-wrap">\n    <canvas id="subCanvas"></canvas>\n  </div>\n  <div id="subHoverRationale" style="padding:8px 14px; background:#0a0a0c; border-top:1px solid rgba(132,164,139,0.25); font-size:11px; color:#cbd5e1; min-height:36px; display:flex; align-items:center; gap:8px;">\n    <span style="color:#84a48b; font-weight:700;">💡 Pasa el cursor o haz clic sobre un nodo vecino para explorar su relación biótica en detalle.</span>\n  </div>'
    )

with open('template_garden.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied CSS and DOM modifications to template_garden.html successfully!")
