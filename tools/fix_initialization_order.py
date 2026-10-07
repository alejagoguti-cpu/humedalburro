import os

with open('modulo-11-garden.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Ensure all groups and variables are declared at the very top (before any function uses them)
top_setup_start = '// ---- Setup de Escena, Cámara y Renderizador WebGL ----'
top_setup_end = 'createExpansiveBase();'

new_top_setup = """// ---- Setup de Escena, Cámara y Renderizador WebGL ----
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
  const camToast = document.getElementById("camToast");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x000000, 0.00065);

  const sceneRoot = new THREE.Group();
  scene.add(sceneRoot);

  const networkGroup = new THREE.Group();
  sceneRoot.add(networkGroup);
  const nodeSprites = [];
  const rawNodes = [];
  const rawEdges = [];
  const edgeDetailsMap = {};

  const sceneBaseGroup = new THREE.Group();
  sceneBaseGroup.visible = false;
  sceneRoot.add(sceneBaseGroup);

  const territoryBeaconsGroup = new THREE.Group();
  territoryBeaconsGroup.visible = false;
  sceneRoot.add(territoryBeaconsGroup);
  const territoryBeacons = [];

  const speciesConstellationGroup = new THREE.Group();
  sceneRoot.add(speciesConstellationGroup);

  const activeTreeIndicatorGroup = new THREE.Group();
  sceneRoot.add(activeTreeIndicatorGroup);

  let currentFov = 44;
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.PerspectiveCamera(currentFov, aspect, 0.8, 9500);

  const swarmCamPos = new THREE.Vector3(0, 0, 85);
  const swarmTarget = new THREE.Vector3(0, 0, 0);

  let territoryCamPos = new THREE.Vector3(180, 270, 310);
  let territoryTarget = new THREE.Vector3(35, 0, 10);

  try {
    const savedCam = localStorage.getItem("saved_territory_cam");
    if (savedCam) {
      const parsed = JSON.parse(savedCam);
      if (parsed.pos && parsed.target) {
        territoryCamPos.set(parsed.pos.x, parsed.pos.y, parsed.pos.z);
        territoryTarget.set(parsed.target.x, parsed.target.y, parsed.target.z);
      }
    }
    if (localStorage.getItem("hide_cam_helper") === "true" && camInspectorBox) {
      camInspectorBox.classList.add("hidden");
    }
  } catch(e) {}

  const waypoints = {
    overview:    { pos: territoryCamPos, target: territoryTarget, fov: 44 },
    burro:       { pos: new THREE.Vector3(210, 85, 95),  target: new THREE.Vector3(210, 0, -10), fov: 46 },
    vaca:        { pos: new THREE.Vector3(65, 80, 215),  target: new THREE.Vector3(65, 0, 125), fov: 46 },
    techo:       { pos: new THREE.Vector3(292, 80, 10),  target: new THREE.Vector3(292, 0, -80), fov: 46 },
    perspective: { pos: new THREE.Vector3(206, 3.8, 50), target: new THREE.Vector3(214, 3.2, 135), fov: 68 }
  };

  camera.position.copy(swarmCamPos);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  let controls;
  try {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.screenSpacePanning = true;
    controls.maxDistance = 3500;
    controls.minDistance = 1.8;
    controls.maxPolarAngle = Math.PI;
    controls.target.copy(swarmTarget);
  } catch(e) {
    console.warn("OrbitControls not available, using fallback:", e);
    controls = {
      enableDamping: false,
      target: new THREE.Vector3(0, 0, 0),
      update: () => {},
      addEventListener: () => {}
    };
  }

  window.addEventListener("resize", () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (typeof particleMat !== "undefined" && particleMat && particleMat.uniforms && particleMat.uniforms.uPixelRatio) {
      particleMat.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
    }
  });

  // Base Paisajística del Territorio
  function createExpansiveBase() {
    const discGeo = new THREE.RingGeometry(5, 1700, 80);
    const discMat = new THREE.MeshBasicMaterial({ color: 0x070709, transparent: true, opacity: 0.94, side: THREE.DoubleSide });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.6;
    sceneBaseGroup.add(disc);

    const grid = new THREE.GridHelper(2800, 100, 0x1E3A34, 0x0a0a0c);
    grid.position.y = -0.55;
    grid.material.opacity = 0.35;
    grid.material.transparent = true;
    sceneBaseGroup.add(grid);
  }
  createExpansiveBase();"""

p1 = js.find(top_setup_start)
p2 = js.find(top_setup_end)
if p1 != -1 and p2 != -1:
    js = js[:p1] + new_top_setup + js[p2 + len(top_setup_end):]

# 2. Remove duplicate declarations later in the file
# Remove duplicate const territoryBeaconsGroup / territoryBeacons
js = js.replace('const territoryBeaconsGroup = new THREE.Group();\n  territoryBeaconsGroup.visible = false;\n  sceneRoot.add(territoryBeaconsGroup);\n\n  const territoryBeacons = [];', '// (territoryBeaconsGroup already declared at top)')
js = js.replace('const networkGroup = new THREE.Group();\n  sceneRoot.add(networkGroup);\n\n  const SPHERE_RADIUS = 32.0;', 'const SPHERE_RADIUS = 32.0;')
js = js.replace('const rawNodes = [];\n  const nodeSprites = [];', '// (rawNodes, nodeSprites declared at top)')
js = js.replace('const rawEdges = [];\n  const edgeDetailsMap = {};', '// (rawEdges, edgeDetailsMap declared at top)')
js = js.replace('const speciesConstellationGroup = new THREE.Group();\n  sceneRoot.add(speciesConstellationGroup);', '// (speciesConstellationGroup declared at top)')
js = js.replace('const activeTreeIndicatorGroup = new THREE.Group();\n  sceneRoot.add(activeTreeIndicatorGroup);', '// (activeTreeIndicatorGroup declared at top)')

# 3. Fix calculateTerritoryCoordinate to check both number and string cat
old_calc_cat = """  function calculateTerritoryCoordinate(t, idx, total) {
    const cat = t.cat;

    if (cat === "Anfibios") {"""

new_calc_cat = """  function calculateTerritoryCoordinate(t, idx, total) {
    const cat = t.cat;

    if (cat === 4 || cat === "Anfibios") {"""

js = js.replace(old_calc_cat, new_calc_cat)
js = js.replace('} else if (cat === "Moluscos") {', '} else if (cat === 3 || cat === "Moluscos") {')
js = js.replace('} else if (cat === "Reptiles") {', '} else if (cat === 5 || cat === "Reptiles") {')
js = js.replace('} else if (cat === "Mamíferos") {', '} else if (cat === 2 || cat === "Mamíferos") {')
js = js.replace('} else if (cat === "Aves") {', '} else if (cat === 1 || cat === "Aves") {')

# 4. Add numeric keys to CAT_EMOJIS and TAXONOMIC_CONVENTIONS
tax_conv_search = 'const TAXONOMIC_CONVENTIONS = {'
tax_conv_replace = """const TAXONOMIC_CONVENTIONS = {
    0: { color: "#84A48B", hex: 0x84A48B, name: "Flora & Arbolado SIGAU", catIdx: 0 },
    1: { color: "#38BDF8", hex: 0x38BDF8, name: "Aves", catIdx: 1 },
    2: { color: "#F59E0B", hex: 0xF59E0B, name: "Mamíferos", catIdx: 2 },
    3: { color: "#EC4899", hex: 0xEC4899, name: "Moluscos", catIdx: 3 },
    4: { color: "#10B981", hex: 0x10B981, name: "Anfibios", catIdx: 4 },
    5: { color: "#A855F7", hex: 0xA855F7, name: "Reptiles", catIdx: 5 },"""

js = js.replace(tax_conv_search, tax_conv_replace, 1)

# Write updated modulo-11-garden.js
with open('modulo-11-garden.js', 'w', encoding='utf-8') as out:
    out.write(js)

print("Fixed initialization order in modulo-11-garden.js successfully.")

# Sync with modulo-11-garden.html and index.html
with open('modulo-11-garden.html', 'r', encoding='utf-8') as f:
    html = f.read()

script_start = html.find('<script>\n// =====================================================================\n// Sistema Socioecológico de Kennedy')
if script_start == -1:
    script_start = html.find('<script>\n// =====================================================================')

new_html = html[:script_start] + '<script>\n' + js + '\n</script>\n</body>\n</html>'

with open('modulo-11-garden.html', 'w', encoding='utf-8') as out:
    out.write(new_html)

with open('index.html', 'w', encoding='utf-8') as out:
    out.write(new_html)

print("Synchronized modulo-11-garden.html and index.html successfully.")
