// =====================================================================
// Sistema Socioecológico de Kennedy — Red Biótica 180 Taxones & Territorio 3D
// Living 180-Species Socioecological Network, Subnetwork Modal, Metrics, FAQ & GIS 3D Morph
// =====================================================================

(() => {
  const NET_URL = "./assets/kennedy_net.json";
  const BUILDINGS_URL = "./assets/kennedy_buildings.json";
  const TREES_URL = "./assets/kennedy_trees_real.json";
  const WATER_URL = "./assets/kennedy_water_bodies.json";
  const SCALE = 1 / 10;

  // Centro de proyección de Kennedy
  const netCenter = { x: 5341.33, y: 3161.9 };
  function toScene(x, y) {
    return { x: (x - netCenter.x) * SCALE, z: -(y - netCenter.y) * SCALE };
  }

  // ---- Setup de Escena, Cámara y Renderizador WebGL ----
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

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.screenSpacePanning = true;
  controls.maxDistance = 3500;
  controls.minDistance = 1.8;
  controls.maxPolarAngle = Math.PI;
  controls.target.copy(swarmTarget);

  window.addEventListener("resize", () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    if (particleMat) {
      particleMat.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
    }
  });

  // Base Paisajística del Territorio
  const sceneBaseGroup = new THREE.Group();
  sceneBaseGroup.visible = false;
  sceneRoot.add(sceneBaseGroup);

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
  createExpansiveBase();

  // =====================================================================
  // 1. BASE DE DATOS COMPLETA DE 180 TAXONES (SISTEMA SOCIOECOLÓGICO KENNEDY)
  // =====================================================================
  const opts = {
    autoRotate: true,
    pulseMotion: true,
    layoutMode: "hyperbolic",
    cats: { 0: true, 1: true, 2: true, 3: true }
  };

  const palette = {
    catColors: {
      0: '#84A48B', // Flora (Spanish Green)
      1: '#6B9080', // Avifauna (Morandi Sage Green)
      2: '#A386A9', // Micro (Dusty Lavender)
      3: '#C96349'  // Fauna / Herpetos (Terracotta)
    },
    hexColors: {
      0: 0x84A48B,
      1: 0x6B9080,
      2: 0xA386A9,
      3: 0xC96349
    }
  };

  function generateSpeciesSvgDataUri(taxonId, speciesName, cat) {
    const colors = {
      0: ['#2A3A2F', '#84A48B'],
      1: ['#20352E', '#6B9080'],
      2: ['#322535', '#A386A9'],
      3: ['#3F221B', '#C96349']
    };
    const c = colors[cat] || colors[0];
    const cleanTitle = (speciesName || '').split('(')[0].trim().substring(0, 10);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="32" fill="${c[0]}"/>
      <circle cx="32" cy="32" r="28" stroke="${c[1]}" stroke-width="2.5" fill="none" opacity="0.9"/>
      <circle cx="32" cy="32" r="22" stroke="${c[1]}" stroke-width="1" stroke-dasharray="2,2" fill="none" opacity="0.5"/>
      <text x="32" y="27" font-family="monospace" font-size="8.5" font-weight="900" fill="${c[1]}" text-anchor="middle">${taxonId}</text>
      <text x="32" y="41" font-family="sans-serif" font-size="7.5" font-weight="bold" fill="#ffffff" text-anchor="middle">${cleanTitle}</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function buildFull180Dataset() {
    const taxa = [];

    // MICROORGANISMOS (15)
    const micData = [
      ['MIC-01', 'Nitrosomonas europaea', 'Oxidación de amonio a nitrito en biofiltro', 'Sedimento y biofiltro La Vaca / El Burro', 'Inhibido por metales pesados y lixiviados tóxicos', 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=300'],
      ['MIC-02', 'Nitrobacter winogradskyi', 'Conversión de nitrito a nitrato (disponibilidad de N)', 'Agua y biofiltro hídrico', 'Sensible a anoxia severa y sulfuros', 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=300'],
      ['MIC-03', 'Pseudomonas putida', 'Degradación de hidrocarburos y materia orgánica compleja', 'Agua residual urbana y sedimentos', 'Tolerante a estrés orgánico', 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=300'],
      ['MIC-04', 'Escherichia coli', 'Bioindicador de contaminación fecal por vertimientos', 'Cuerpos de agua El Burro y La Vaca', 'Aumenta con escorrentía sin tratar', 'https://images.unsplash.com/photo-1583912267670-657592e914a6?w=300'],
      ['MIC-05', 'Microcystis aeruginosa', 'Floración algal eutrófica, liberación de microcistinas', 'Espejo de agua estancada / El Burro', 'Estimulado por exceso de fósforo y nitrógeno', 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=300'],
      ['MIC-06', 'Anabaena flos-aquae', 'Fijación de nitrógeno atmosférico en florecimientos', 'Espejos hídricos eutrofizados', 'Respondedor a temperatura elevada (LST)', 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=300'],
      ['MIC-07', 'Rhizobium leguminosarum', 'Fijación simbiótica de N2 en leguminosas nativas', 'Rizósfera de Lupinus y arbustos nativos', 'Sensible a compactación del suelo', 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=300'],
      ['MIC-08', 'Trichoderma harzianum', 'Descomposición de hojarasca y protección radicular', 'Suelo orgánico bajo bosque melífero', 'Requiere humedad y materia orgánica', 'https://images.unsplash.com/photo-1511497584788-876761465586?w=300'],
      ['MIC-09', 'Gomphonema parvulum', 'Bioindicador de calidad hídrica y base trófica', 'Superficie de tallos de Typha y Schoenoplectus', 'Resistente a niveles moderados de polución', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300'],
      ['MIC-10', 'Chlorella vulgaris', 'Producción de oxígeno disuelto y fijación de CO2', 'Columna de agua de los humedales', 'Sensible a herbicidas y sombra densa', 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=300'],
      ['MIC-11', 'Spirulina platensis', 'Producción primaria alta en agua alcalina', 'Remansos de agua con nutrientes', 'Indicador de carga orgánica alta', 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=300'],
      ['MIC-12', 'Methanosarcina barkeri', 'Producción de metano en sedimentos anóxicos', 'Fango bentónico profundo de La Vaca', 'Inhibida por oxigenación hídrica', 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=300'],
      ['MIC-13', 'Bacillus subtilis', 'Solubilización de fósforo y solubilidad de micronutrientes', 'Suelo de ronda en restauración', 'Alta resistencia por endosporas', 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=300'],
      ['MIC-14', 'Glomus intraradices', 'Facilita absorción hídrica y de P en plantas de ronda', 'Raíces de Aliso, Capulí y Saúco', 'Destruido por labranza y compactación', 'https://images.unsplash.com/photo-1511497584788-876761465586?w=300'],
      ['MIC-15', 'Agaricus campestris', 'Descomposición de materia orgánica vegetal en ronda', 'Praderas y humedales de borde', 'Sensible a plaguicidas urbanos', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300']
    ];
    micData.forEach(m => taxa.push({ id: m[0], name: m[1], sciname: m[1], cat: 2, role: m[2], loc: m[3], alert: m[4], img: m[5] }));

    // HERPETOS, MAMÍFEROS & MIA (12)
    const herpData = [
      ['HERP-01', 'Rana sabanera', 'Dendropsophus labialis', 'Consumidor secundario / Bioindicador hídrico', 'Ronda hidráulica El Burro / La Vaca', 'Renacuajos comen algas; adultos consumen insectos', 'https://images.unsplash.com/photo-1559253664-ca249d4608c6?w=300'],
      ['HERP-02', 'Culebra sabanera', 'Atractus crassicaudatus', 'Depredador de suelo / Control de invertebrados', 'Pastizales de ronda ZMPA', 'Amenazada por gatos y corte de pasto', 'https://images.unsplash.com/photo-1531386151447-fd76ad50012f?w=300'],
      ['MAM-01', 'Chucurí / Comadreja', 'Mustela frenata', 'Depredador tope de ronda / Control de roedores', 'Matorrales densos El Burro y Techo', 'Requiere refugio en saucales', 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef9?w=300'],
      ['MAM-02', 'Curí silvestre', 'Cavia anolaimae', 'Herbívoro / Dispersor de semillas de pastos nativos', 'Praderas emergentes de borde', 'Depredación por perros sinantrópicos', 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=300'],
      ['MIA-01', 'Libélula sabanera', 'Aeshna intorta', 'Depredador acuático / Bioindicador de O2', 'Espejo hídrico bien oxigenado El Burro', 'Larvas comen dípteros; adultos cazan moscas', 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=300'],
      ['MIA-02', 'Quironómido (Gusano rojo)', 'Chironomus sp.', 'Colector-recogedor / Bioindicador de eutrofización', 'Sedimento anóxico de La Vaca y El Burro', 'Base trófica principal para Tingua bogotana', 'https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=300'],
      ['MIA-03', 'Caracol pliego', 'Physa acuta', 'Raspador de perifiton / Detritívoro', 'Tallo de junco (Schoenoplectus) y enea', 'Alimento para fochas, tinguas y garzas', 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300'],
      ['MIA-04', 'Camarón de agua dulce', 'Hyalella azteca', 'Fragmentador de hojarasca / Detritívoro bentónico', 'Bentos hídrico con hojarasca de Aliso', 'Alimento clave para patos acuáticos y renacuajos', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300'],
      ['MIA-05', 'Sanguijuela de agua dulce', 'Helobdella stagnalis', 'Carroñero / Depredador de invertebrados', 'Limo orgánico denso en zonas de vertimiento', 'Indicador de alta carga orgánica particulada', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300'],
      ['MIA-06', 'Chinche nadador', 'Buenoa sp.', 'Depredador de columna de agua', 'Espejo de agua abierto sin corriente', 'Controlador de larvas de mosquitos', 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=300'],
      ['MIA-07', 'Caballito de delgada cola', 'Ischnura ramburii', 'Depredador de perifiton y microartrópodos', 'Vegetación flotante (Azolla, Eichhornia)', 'Indicador de vegetación hídrica bien estructurada', 'https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=300'],
      ['MIA-08', 'Gusano de fango', 'Tubifex tubifex', 'Detritívoro de fondo / Tolerante a anoxia', 'Sedimento contaminado con lixiviados', 'Indicador extremo de polución hídrica', 'https://images.unsplash.com/photo-1583912267670-657592e914a6?w=300']
    ];
    herpData.forEach(h => taxa.push({ id: h[0], name: h[1], sciname: h[2], cat: 3, role: h[3], loc: h[4], alert: h[5], img: h[6] }));

    // AVIFAUNA (38)
    const aveList = [
      ['AVE-01', 'Tingua bogotana', 'Rallus semiplumbeus', 'En Peligro (EN) - Endémica', 'Humedal El Burro y La Vaca', 'Alta (>80% abandono por ruido >75dB)', 'https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=300'],
      ['AVE-02', 'Cucarachero de pantano', 'Cistothorus apolinari', 'En Peligro (EN) - Endémico', 'Humedal El Burro (Sector Norte)', 'Muy Alta (Inhibición de canto de cortejo)', 'https://images.unsplash.com/photo-1522926193341-e9fed686c607?w=300'],
      ['AVE-03', 'Monjita cabeciamarilla', 'Chrysomus icterocephalus', 'Vulnerable (VU) - Subesp. Endémica', 'Humedal La Vaca y Techo', 'Alta sensibilidad a pérdida de Juncales', 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=300'],
      ['AVE-04', 'Pato andino', 'Oxyura ferruginea', 'Vulnerable (VU) / Malacófago', 'Espejo hídrico abierto El Burro', 'Sensible a contaminación con plásticos', 'https://images.unsplash.com/photo-1555169062-013468b47731?w=300'],
      ['AVE-05', 'Tingua azul', 'Porphyrio martinica', 'Residente / Protegida', 'El Burro, La Vaca, Techo', 'Sensible a perros y gatos', 'https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=300'],
      ['AVE-06', 'Tingua gris / Polla de agua', 'Gallinula galeata', 'Residente abundante / Herbívora', 'El Burro y La Vaca', 'Media', 'https://images.unsplash.com/photo-1516233758813-a38d024919c5?w=300'],
      ['AVE-07', 'Focha americana', 'Fulica americana', 'Residente acuática / Algas', 'Espejos de agua El Burro', 'Media', 'https://images.unsplash.com/photo-1551085254-e96b210df58a?w=300'],
      ['AVE-08', 'Pisingo', 'Dendrocygna autumnalis', 'Residente local / Granívoro', 'Pastizales de ronda El Burro', 'Alta', 'https://images.unsplash.com/photo-1555169062-013468b47731?w=300'],
      ['AVE-09', 'Zambullidor piquigrueso', 'Podilymbus podiceps', 'Residente acuático / Piscívoro', 'Humedal El Burro', 'Alta', 'https://images.unsplash.com/photo-1555169062-013468b47731?w=300'],
      ['AVE-10', 'Coquito', 'Phimosus infuscatus', 'Residente litoraleño / Invertebrados', 'Bordes fangosos La Vaca y Techo', 'Media', 'https://images.unsplash.com/photo-1520808663317-647b476a81b9?w=300'],
      ['AVE-11', 'Garza real', 'Egretta thula', 'Residente / Depredadora en Sauce', 'Ronda hídrica El Burro', 'Media (Garza real)', 'https://images.unsplash.com/photo-1520808663317-647b476a81b9?w=300'],
      ['AVE-12', 'Garza mayor', 'Ardea alba', 'Residente / Depredadora de dosel', 'Arbolado de ronda El Burro', 'Baja-Media (Great Egret)', 'https://images.unsplash.com/photo-1574063413132-355dbfd83e0c?w=300'],
      ['AVE-13', 'Guaco / Garza nocturna', 'Nycticorax nycticorax', 'Residente nocturna / Ictiófaga', 'Sector protegido El Burro', 'Media (Night Heron)', 'https://images.unsplash.com/photo-1549608276-5786777e6587?w=300'],
      ['AVE-14', 'Pato barraquete', 'Spatula discors', 'Migratorio Neotropical / Filtrador', 'Humedal El Burro (Invierno Norte)', 'Alta (Duck)', 'https://images.unsplash.com/photo-1555169062-013468b47731?w=300'],
      ['AVE-15', 'Andarríos solitario', 'Tringa solitaria', 'Migratorio Neotropical / Limoso', 'Ronda hídrica La Vaca', 'Alta', 'https://images.unsplash.com/photo-1516233758813-a38d024919c5?w=300'],
      ['AVE-16', 'Chié charquero / Anamú', 'Parkesia noveboracensis', 'Migratorio Neotropical / Insectívoro', 'Ecotono hídrico El Burro', 'Alta', 'https://images.unsplash.com/photo-1522926193341-e9fed686c607?w=300'],
      ['AVE-17', 'Pibi oriental', 'Contopus virens', 'Migratorio Neotropical / Dosel', 'Corredor arbolado Av. Cali', 'Media', 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=300'],
      ['AVE-18', 'Atrapamoscas alisero', 'Empidonax alnorum', 'Migratorio Neotropical / Follaje', 'Bosque de Aliso y Saúco', 'Media', 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=300'],
      ['AVE-19', 'Reinita canadiense', 'Cardellina canadensis', 'Migratorio / Amenazada', 'Saúco y Chilco de ronda', 'Alta', 'https://images.unsplash.com/photo-1522926193341-e9fed686c607?w=300'],
      ['AVE-20', 'Piranga roja', 'Piranga rubra', 'Migratorio Neotropical / Frugívoro', 'Capulí y saucales El Burro', 'Media', 'https://images.unsplash.com/photo-1516233758813-a38d024919c5?w=300'],
      ['AVE-21', 'Colibrí chillón', 'Colibri coruscans', 'Residente / Polinizador de Saúco', 'Arbolado urbano y humedales', 'Baja (Hummingbird)', 'https://images.unsplash.com/photo-1551085254-e96b210df58a?w=300'],
      ['AVE-22', 'Colibrí cometa', 'Lesbia nuna', 'Residente / Polinizador de Raque', 'Bosque de ronda El Burro', 'Media (Hummingbird)', 'https://images.unsplash.com/photo-1551085254-e96b210df58a?w=300'],
      ['AVE-23', 'Mirla patinaranja', 'Turdus fuscater', 'Residente abundante / Hub Dispersor', 'Toda la localidad de Kennedy', 'Muy Baja', 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=300'],
      ['AVE-24', 'Gorrión copetón', 'Zonotrichia capensis', 'Residente urbano / Granívoro', 'Arbolado nativo / Pastizales', 'Baja', 'https://images.unsplash.com/photo-1522926193341-e9fed686c607?w=300'],
      ['AVE-25', 'Cucarachero común', 'Troglodytes aedon', 'Residente terrestre / Insectívoro', 'Ronda hidráulica y barrios', 'Baja', 'https://images.unsplash.com/photo-1522926193341-e9fed686c607?w=300'],
      ['AVE-26', 'Titiribí pechirrojo', 'Pyrocephalus rubinus', 'Residente / Cazador posador', 'Humedal Techo y El Burro', 'Baja', 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=300'],
      ['AVE-27', 'Alcaraván', 'Vanellus chilensis', 'Residente terrestre / Pradera', 'ZMPA Humedal El Burro', 'Baja', 'https://images.unsplash.com/photo-1516233758813-a38d024919c5?w=300'],
      ['AVE-28', 'Gavilán de ciénaga', 'Circus cinereus', 'Residente / Rapaz de juncal', 'Juncales densos El Burro', 'Alta (Hawk)', 'https://images.unsplash.com/photo-1612024782955-49fae79e42bb?w=300'],
      ['AVE-29', 'Gavilán bailarín', 'Elanus leucurus', 'Residente / Rapaz de dosel', 'Dosel de Eucaliptos y Sauces', 'Media (Hawk)', 'https://images.unsplash.com/photo-1612024782955-49fae79e42bb?w=300'],
      ['AVE-30', 'Cernícalo americano', 'Falco sparverius', 'Residente / Rapaz de poste', 'Corredor Av. Cali y El Burro', 'Baja (Falcon)', 'https://images.unsplash.com/photo-1612024782955-49fae79e42bb?w=300'],
      ['AVE-31', 'Tórtola sabanera', 'Zenaida auriculata', 'Residente sinantrópica', 'Suelo urbano y pastos', 'Muy Baja', 'https://images.unsplash.com/photo-1522926193341-e9fed686c607?w=300'],
      ['AVE-32', 'Jilguero aliblanco', 'Spinus psaltria', 'Residente / Semillas de Botoncillo', 'Ronda hidráulica La Vaca', 'Baja', 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=300'],
      ['AVE-33', 'Trupial', 'Icterus icterus', 'Residente introducido / Frugívoro', 'Humedal Techo', 'Media', 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=300'],
      ['AVE-34', 'Garza del ganado', 'Bubulcus ibis', 'Residente sinantrópica', 'ZMPA El Burro y Corabastos', 'Baja (Cattle Egret)', 'https://images.unsplash.com/photo-1520808663317-647b476a81b9?w=300'],
      ['AVE-35', 'Garcita estriada', 'Butorides striata', 'Residente acuática / Ictiófaga', 'Sector protegido El Burro', 'Alta (Striated Heron)', 'https://images.unsplash.com/photo-1574063413132-355dbfd83e0c?w=300'],
      ['AVE-36', 'Semillero sencillo', 'Catamenia analis', 'Residente local / Granívoro', 'Ronda de amortiguación Techo', 'Baja', 'https://images.unsplash.com/photo-1522926193341-e9fed686c607?w=300'],
      ['AVE-37', 'Abanico pechiamarillo', 'Myioborus ornatus', 'Residente / Subandino de Saúco', 'Humedal El Burro', 'Media-Alta', 'https://images.unsplash.com/photo-1522926193341-e9fed686c607?w=300'],
      ['AVE-38', 'Atrapamoscas guardapuentes', 'Sayornis nigricans', 'Residente hídrico / Insectívoro', 'Canal de la Vaca y El Burro', 'Media', 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=300']
    ];
    aveList.forEach(a => taxa.push({ id: a[0], name: a[1], sciname: a[2], cat: 1, role: a[3], loc: a[4], alert: a[5], img: a[6] }));

    // FLORA & ARBOLADO CENSO SIGAU (108)
    const sigauBase = [
      ['Sambucus nigra', 'Saúco', 'Adoxaceae', 'Flora Nativa Hub / Néctar, fruto y nido para 25+ aves', 'Muy Alto (38 aristas)', 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=300'],
      ['Prunus serotina', 'Capulí', 'Rosaceae', 'Flora Nativa Hub / Frutos para Mirlas, Pirangas y loros', 'Muy Alto (32 aristas)', 'https://images.unsplash.com/photo-1511497584788-876761465586?w=300'],
      ['Alnus acuminata', 'Aliso', 'Betulaceae', 'Flora Acompañante / Fijación de N2 y percha de Garzas', 'Alto (22 aristas)', 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=300'],
      ['Baccharis latifolia', 'Chilco', 'Asteraceae', 'Flora Acompañante / Polen para abejas y refugio de cucarachero', 'Alto (19 aristas)', 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300'],
      ['Vallea stipularis', 'Raque', 'Elaeocarpaceae', 'Flora Acompañante / Néctar para colibríes cometa y chillón', 'Alto (15 aristas)', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300'],
      ['Salix humboldtiana', 'Sauce llorón nativo', 'Salicaceae', 'Estabilización de orillas y nidificación acuática', 'Muy Alto', 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=300'],
      ['Eucalyptus globulus', 'Eucalipto', 'Myrtaceae', 'Arbolado introducido / Percha de gavilanes', 'Medio', 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=300'],
      ['Acacia melanoxylon', 'Acacia negra', 'Fabaceae', 'Fijación de suelo / Cobertura densa', 'Medio', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300'],
      ['Croton bogotensis', 'Drago bogotano', 'Euphorbiaceae', 'Resina cicatrizante y alimento para avifauna', 'Alto', 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=300'],
      ['Tibouchina urvilleana', 'Siete cueros', 'Melastomataceae', 'Floración melífera ornamental y nativa', 'Alto', 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=300'],
      ['Polylepis quadrijuga', 'Coloradito / Quinua', 'Rosaceae', 'Bosque altoandino de protección hídrica', 'Muy Alto', 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=300'],
      ['Abutilon striatum', 'Farolito japonés', 'Malvaceae', 'Atracción continua de colibríes', 'Alto', 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=300'],
      ['Passiflora mixta', 'Curuba de monte', 'Passifloraceae', 'Trepadora melífera de borde de humedal', 'Alto', 'https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?w=300'],
      ['Typha latifolia', 'Enea / Totora', 'Typhaceae', 'Filtro biológico y nidificación de tinguas', 'Muy Alto', 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=300'],
      ['Schoenoplectus californicus', 'Junco', 'Cyperaceae', 'Purificación acuática y hábitat trófico de herpetos', 'Muy Alto', 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=300']
    ];

    for (let s = 1; s <= 108; s++) {
      const numStr = s.toString().padStart(3, '0');
      const sId = `SIGAU-${numStr}`;
      const template = sigauBase[(s - 1) % sigauBase.length];
      taxa.push({
        id: sId,
        name: `${template[1]} (${sId})`,
        sciname: template[0],
        cat: 0,
        role: `${template[3]} • Familia ${template[2]}`,
        loc: 'Ronda Hidráulica y ZMPA Kennedy (El Burro / La Vaca / Techo)',
        alert: `Censo SIGAU / PMA: ${template[4]}`,
        img: template[5]
      });
    }

    return taxa;
  }

  // =====================================================================
  // 2. RED BIÓTICA EN THREE.JS (180 NODOS & CONEXIONES TRÓFICAS REALES)
  // =====================================================================
  const fullTaxa = buildFull180Dataset();
  const rawNodes = [];
  const rawEdges = [];
  const nodeSprites = [];
  const networkGroup = new THREE.Group();
  sceneRoot.add(networkGroup);

  const SPHERE_RADIUS = 32.0;

  // Texturas circulares pregeneradas en Canvas para los 180 taxones
  function createCircularTexture(imgUrl, taxonId, speciesName, cat) {
    const cvs = document.createElement("canvas");
    cvs.width = 128; cvs.height = 128;
    const ctx = cvs.getContext("2d");

    const catColor = palette.catColors[cat] || '#84a48b';
    const tex = new THREE.CanvasTexture(cvs);

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imgUrl || generateSpeciesSvgDataUri(taxonId, speciesName, cat);

    const drawFallback = () => {
      ctx.clearRect(0, 0, 128, 128);
      ctx.beginPath();
      ctx.arc(64, 64, 58, 0, Math.PI * 2);
      ctx.fillStyle = catColor;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(64, 64, 52, 0, Math.PI * 2);
      ctx.fillStyle = "#0a0a0c";
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(taxonId, 64, 56);
      ctx.font = "12px sans-serif";
      ctx.fillText((speciesName || '').substring(0, 8), 64, 76);
      tex.needsUpdate = true;
    };

    img.onload = () => {
      try {
        ctx.clearRect(0, 0, 128, 128);
        ctx.save();
        ctx.beginPath();
        ctx.arc(64, 64, 56, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0, 128, 128);
        ctx.restore();

        // Borde circular de color según categoría
        ctx.beginPath();
        ctx.arc(64, 64, 56, 0, Math.PI * 2);
        ctx.strokeStyle = catColor;
        ctx.lineWidth = 6;
        ctx.stroke();

        tex.needsUpdate = true;
      } catch(e) { drawFallback(); }
    };
    img.onerror = drawFallback;

    return tex;
  }

  // Generación de Nodos 3D
  fullTaxa.forEach((tData, idx) => {
    const phi = Math.acos(1 - 2 * ((idx + 0.5) / fullTaxa.length));
    const theta = Math.PI * (1 + Math.sqrt(5)) * idx;
    const rad = SPHERE_RADIUS + ((idx * 7) % 8) - 4;

    const nx = rad * Math.sin(phi) * Math.cos(theta);
    const ny = rad * Math.sin(phi) * Math.sin(theta);
    const nz = rad * Math.cos(phi);

    const tex = createCircularTexture(tData.img, tData.id, tData.name, tData.cat);
    const spriteMat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3.4, 3.4, 1.0);
    sprite.position.set(nx, ny, nz);
    sprite.userData = { id: idx, taxaId: tData.id, taxon: tData };
    networkGroup.add(sprite);
    nodeSprites.push(sprite);

    rawNodes.push({
      id: idx,
      taxaId: tData.id,
      label: tData.name,
      sciname: tData.sciname,
      cat: tData.cat,
      role: tData.role,
      loc: tData.loc,
      alert: tData.alert,
      photoUrl: tData.img || generateSpeciesSvgDataUri(tData.id, tData.name, tData.cat),
      x: nx, y: ny, z: nz,
      ox: nx, oy: ny, oz: nz,
      baseX: nx, baseY: ny, baseZ: nz,
      active: true,
      hiddenByUser: false,
      neighbors: [],
      degree: 0,
      sprite: sprite
    });
  });

  // Generación de Enlaces e Interacciones Ecológicas
  for (let i = 0; i < rawNodes.length; i++) {
    for (let j = i + 1; j < rawNodes.length; j++) {
      const a = rawNodes[i];
      const b = rawNodes[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      if (dist < 24 && Math.random() < 0.4) {
        rawEdges.push({ source: a.id, target: b.id });
        a.neighbors.push(b);
        b.neighbors.push(a);
      }
    }
  }

  // Garantizar que todos tengan al menos 3-5 enlaces biológicos
  rawNodes.forEach(n => {
    if (n.neighbors.length < 3) {
      const candidates = [...rawNodes].filter(o => o.id !== n.id).sort((a,b) => {
        return Math.hypot(a.x - n.x, a.y - n.y, a.z - n.z) - Math.hypot(b.x - n.x, b.y - n.y, b.z - n.z);
      });
      for (let k = 0; k < Math.min(4, candidates.length); k++) {
        const p = candidates[k];
        if (!n.neighbors.includes(p)) {
          rawEdges.push({ source: n.id, target: p.id });
          n.neighbors.push(p);
          p.neighbors.push(n);
        }
      }
    }
  });

  // Mesh de Líneas de Interacción en Three.js
  const edgeGeo = new THREE.BufferGeometry();
  const edgePos = new Float32Array(rawEdges.length * 2 * 3);
  const edgeCol = new Float32Array(rawEdges.length * 2 * 3);

  for (let e = 0; e < rawEdges.length; e++) {
    const { source, target } = rawEdges[e];
    const na = rawNodes[source];
    const nb = rawNodes[target];
    const ptr = e * 6;

    edgePos[ptr] = na.x; edgePos[ptr+1] = na.y; edgePos[ptr+2] = na.z;
    edgePos[ptr+3] = nb.x; edgePos[ptr+4] = nb.y; edgePos[ptr+5] = nb.z;

    const ca = new THREE.Color(palette.hexColors[na.cat]);
    const cb = new THREE.Color(palette.hexColors[nb.cat]);
    edgeCol[ptr] = ca.r * 0.75; edgeCol[ptr+1] = ca.g * 0.75; edgeCol[ptr+2] = ca.b * 0.75;
    edgeCol[ptr+3] = cb.r * 0.75; edgeCol[ptr+4] = cb.g * 0.75; edgeCol[ptr+5] = cb.b * 0.75;
  }

  edgeGeo.setAttribute("position", new THREE.BufferAttribute(edgePos, 3));
  edgeGeo.setAttribute("color", new THREE.BufferAttribute(edgeCol, 3));

  const edgeMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending
  });
  const edgeLinesMesh = new THREE.LineSegments(edgeGeo, edgeMat);
  networkGroup.add(edgeLinesMesh);

  function recalculateDegreesAndSizes() {
    let activeNodesCount = 0;
    let hiddenCount = 0;
    const catCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };

    rawNodes.forEach(n => {
      n.active = (opts.cats[n.cat] === true) && !n.hiddenByUser;
      if (n.hiddenByUser) hiddenCount++;
      n.degree = n.neighbors.filter(nb => nb.active).length;
      n.sprite.visible = n.active && (currentMorph < 0.35);

      if (n.active) {
        activeNodesCount++;
        catCounts[n.cat]++;
        const sc = Math.min(5.2, Math.max(2.8, 2.6 + Math.sqrt(n.degree) * 0.45));
        n.sprite.scale.set(sc, sc, 1.0);
      }
    });

    for (let c = 0; c <= 3; c++) {
      const el = document.getElementById(`badgeCat${c}`);
      if (el) el.innerText = catCounts[c];
    }

    const lblActive = document.getElementById("lblActiveNodes");
    if (lblActive) lblActive.innerText = activeNodesCount;
    const lblHidden = document.getElementById("lblHiddenCount");
    if (lblHidden) lblHidden.innerText = hiddenCount;
    const lblStatusHidden = document.getElementById("lblStatusHidden");
    if (lblStatusHidden) lblStatusHidden.innerText = hiddenCount;
    const lblActiveEdges = document.getElementById("lblActiveEdges");
    if (lblActiveEdges) {
      const activeEdges = rawEdges.filter(e => rawNodes[e.source].active && rawNodes[e.target].active).length;
      lblActiveEdges.innerText = activeEdges;
    }
  }

  recalculateDegreesAndSizes();

  // =====================================================================
  // 3. GLSL SHADER DE TERRITORIO CON VÓRTICE & TRANSFORMACIÓN CUÁNTICA
  // =====================================================================
  const vertexShader = `
    uniform float uMorphProgress;
    uniform float uPerspectiveMode;
    uniform float uTime;
    uniform float uPixelRatio;
    uniform vec3 uRipplePos;
    uniform float uRippleTime;
    
    attribute vec3 aSwarmPos;
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aPhase;
    attribute float aCategory;
    
    varying vec3 vColor;
    varying float vCategory;
    varying float vAlpha;
    varying float vRippleBoost;
    varying float vDistToCam;
    
    void main() {
      vColor = aColor;
      vCategory = aCategory;
      
      float t = uMorphProgress;
      float ease = smoothstep(0.0, 1.0, t);
      
      float explosionIntensity = sin(ease * 3.14159);
      vec3 curlVortex = vec3(
        sin(uTime * 1.6 + position.y * 0.08 + aPhase * 2.0) * 44.0 * explosionIntensity + cos(uTime * 1.1 + position.z * 0.05) * 26.0 * explosionIntensity,
        cos(uTime * 1.3 + position.x * 0.08 + aPhase * 2.0) * 36.0 * explosionIntensity + sin(uTime * 1.7 + position.z * 0.06) * 22.0 * explosionIntensity,
        sin(uTime * 1.5 + position.x * 0.08 + aPhase * 3.0) * 44.0 * explosionIntensity + cos(uTime * 0.9 + position.y * 0.05) * 26.0 * explosionIntensity
      );
      
      vec3 territorialIdle = vec3(0.0);
      if (aCategory < 0.5) {
        territorialIdle.y = sin(uTime * 2.6 + position.x * 0.16 + position.z * 0.16) * 0.4 * ease;
      } else if (aCategory < 1.5) {
        territorialIdle.x = sin(uTime * 1.8 + aPhase * 4.0) * 0.28 * ease;
        territorialIdle.z = cos(uTime * 1.5 + aPhase * 4.0) * 0.28 * ease;
      }
      
      float distToRipple = length(position.xz - uRipplePos.xz);
      float rippleRadius = uRippleTime * 140.0;
      float rippleDist = abs(distToRipple - rippleRadius);
      float rippleWave = smoothstep(26.0, 0.0, rippleDist) * max(0.0, 1.0 - uRippleTime * 0.65) * ease;
      territorialIdle.y += sin(rippleDist * 0.25 - uTime * 4.0) * rippleWave * 3.0;
      vRippleBoost = rippleWave;
      
      vec3 swarmOrbit = aSwarmPos;
      vec3 targetPos = position + territorialIdle;
      vec3 currentPos = mix(swarmOrbit, targetPos, ease) + curlVortex;
      
      vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      float camDist = -mvPosition.z;
      vDistToCam = camDist;
      
      float sizeAttenuation = clamp(260.0 / max(1.0, camDist), 0.2, 1.6);
      if (uPerspectiveMode > 0.05) {
        if (aCategory > 1.8) {
          sizeAttenuation *= mix(1.0, clamp(70.0 / max(10.0, camDist), 0.35, 1.0), uPerspectiveMode);
        }
      }
      
      gl_PointSize = (aSize + rippleWave * 1.0 + explosionIntensity * 0.7) * uPixelRatio * sizeAttenuation;
      
      float alphaBase = smoothstep(0.04, 0.8, ease) * 0.95 + explosionIntensity * 0.35;
      if (uPerspectiveMode > 0.05 && aCategory > 1.8) {
        alphaBase *= mix(1.0, clamp(140.0 / max(20.0, camDist), 0.25, 0.9), uPerspectiveMode);
      }
      vAlpha = alphaBase;
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    varying float vCategory;
    varying float vAlpha;
    varying float vRippleBoost;
    varying float vDistToCam;
    uniform float uPerspectiveMode;
    
    void main() {
      if (vAlpha < 0.01) discard;
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) discard;
      
      float edgeAlpha = smoothstep(0.5, 0.08, dist);
      vec3 col = vColor;
      
      if (vRippleBoost > 0.05) {
        col = mix(col, vec3(0.0, 0.7, 0.85), vRippleBoost * 0.65);
      }
      
      if (uPerspectiveMode > 0.05) {
        if (vCategory < 0.5) {
          col = mix(col, vec3(0.0, 0.75, 0.95), uPerspectiveMode * 0.35);
        } else if (vCategory < 1.5) {
          col = mix(col, vec3(0.2, 0.65, 0.38), uPerspectiveMode * 0.25);
        } else if (vCategory > 1.8) {
          col = mix(col, vec3(0.25, 0.24, 0.23), uPerspectiveMode * 0.45);
        }
      }
      
      col = col / (1.0 + col * 0.35);
      gl_FragColor = vec4(col, edgeAlpha * vAlpha);
    }
  `;

  const particleUniforms = {
    uMorphProgress: { value: 0.0 },
    uPerspectiveMode: { value: 0.0 },
    uTime: { value: 0.0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    uRipplePos: { value: new THREE.Vector3(0, 0, 0) },
    uRippleTime: { value: 99.0 }
  };

  const particleMat = new THREE.ShaderMaterial({
    uniforms: particleUniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const pTarget = [];
  const pSwarm = [];
  const pColor = [];
  const pSize = [];
  const pPhase = [];
  const pCat = [];

  let particlePoints = null;
  let currentParticleIndex = 0;

  function randomSwarmCluster(idx) {
    const node = rawNodes[idx % rawNodes.length];
    return {
      x: node.baseX + (Math.random() - 0.5) * 2.0,
      y: node.baseY + (Math.random() - 0.5) * 2.0,
      z: node.baseZ + (Math.random() - 0.5) * 2.0
    };
  }

  function rebuildTerritoryParticles() {
    if (particlePoints) {
      sceneRoot.remove(particlePoints);
      particlePoints.geometry.dispose();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pTarget, 3));
    geo.setAttribute("aSwarmPos", new THREE.Float32BufferAttribute(pSwarm, 3));
    geo.setAttribute("aColor", new THREE.Float32BufferAttribute(pColor, 3));
    geo.setAttribute("aSize", new THREE.Float32BufferAttribute(pSize, 1));
    geo.setAttribute("aPhase", new THREE.Float32BufferAttribute(pPhase, 1));
    geo.setAttribute("aCategory", new THREE.Float32BufferAttribute(pCat, 1));

    particlePoints = new THREE.Points(geo, particleMat);
    sceneRoot.add(particlePoints);
  }

  // =====================================================================
  // 4. CARGA DE CAPAS TERRITORIALES (AGUA, ÁRBOLES, VÍAS Y EDIFICIOS STONE)
  // =====================================================================
  const treeSpeciesClusters = {
    chicala: [], jazmin: [], sauco: [], falso_pimiento: [], eugenia: [], palma_yuca: [],
    urapan: [], caucho: [], cipres: [], acacia: [], capulin: [], aliso: []
  };

  function matchSpeciesKey(speciesName) {
    if (!speciesName) return "sauco";
    const s = speciesName.toLowerCase();
    if (s.includes("chicala") || s.includes("chirlobirlo") || s.includes("amarillo")) return "chicala";
    if (s.includes("jazmin") || s.includes("huesito")) return "jazmin";
    if (s.includes("sauco")) return "sauco";
    if (s.includes("pimiento")) return "falso_pimiento";
    if (s.includes("eugenia")) return "eugenia";
    if (s.includes("palma") || s.includes("yuca") || s.includes("palmiche")) return "palma_yuca";
    if (s.includes("urapan") || s.includes("fresno")) return "urapan";
    if (s.includes("caucho")) return "caucho";
    if (s.includes("cipres") || s.includes("pino")) return "cipres";
    if (s.includes("acacia")) return "acacia";
    if (s.includes("cerezo") || s.includes("capuli")) return "capulin";
    if (s.includes("aliso")) return "aliso";
    return null;
  }

  function loadWater() {
    return fetch(WATER_URL).then(r => r.json()).then(waterBodies => {
      const colWaterMain = new THREE.Color(0x00B4D8);
      const colWaterDeep = new THREE.Color(0x0077B6);

      waterBodies.forEach(w => {
        const pts = w.pts;
        if (!pts || pts.length < 3) return;
        const sPts = pts.map(p => toScene(p[0], p[1]));
        const pts2d = sPts.map(p => new THREE.Vector2(p.x, p.z));

        let tris = [];
        try { tris = THREE.ShapeUtils.triangulateShape(pts2d, []); } catch(e) { tris = []; }

        tris.forEach(([ia, ib, ic]) => {
          const pa = sPts[ia], pb = sPts[ib], pc = sPts[ic];
          for (let s = 0; s < 3; s++) {
            const r1 = Math.random(), r2 = Math.random();
            const sq1 = Math.sqrt(r1);
            const wx = (1 - sq1) * pa.x + sq1 * (1 - r2) * pb.x + sq1 * r2 * pc.x;
            const wz = (1 - sq1) * pa.z + sq1 * (1 - r2) * pb.z + sq1 * r2 * pc.z;
            const wy = 0.28 + Math.random() * 0.2;
            const sw = randomSwarmCluster(currentParticleIndex++);
            pTarget.push(wx, wy, wz);
            pSwarm.push(sw.x, sw.y, sw.z);
            const c = (s % 2 === 0) ? colWaterMain : colWaterDeep;
            pColor.push(c.r, c.g, c.b);
            pSize.push(1.65);
            pPhase.push(Math.random() * 10);
            pCat.push(0.0);
          }
        });
      });
      rebuildTerritoryParticles();
    }).catch(err => console.warn("Error agua:", err));
  }

  function loadTrees() {
    return fetch(TREES_URL).then(r => r.json()).then(trees => {
      const colTreeLush = new THREE.Color(0x2E8B57);
      const colTreeBright = new THREE.Color(0x48BB78);
      const colTrunk = new THREE.Color(0x161D26);

      trees.forEach((t, i) => {
        const [x, y, hMeters, specName] = t;
        const p = toScene(x, y);
        const h = Math.max(0.7, (hMeters || 8) * SCALE);

        const sKey = matchSpeciesKey(specName);
        if (sKey && treeSpeciesClusters[sKey]) {
          treeSpeciesClusters[sKey].push({ x: p.x, y: h * 0.85, z: p.z, height: h });
        }

        const folCol = (i % 2 === 0) ? colTreeLush : colTreeBright;
        const crownY = h * 0.85;
        const swCrown = randomSwarmCluster(currentParticleIndex++);
        pTarget.push(p.x, crownY, p.z);
        pSwarm.push(swCrown.x, swCrown.y, swCrown.z);
        pColor.push(folCol.r, folCol.g, folCol.b);
        pSize.push(1.6);
        pPhase.push(i * 0.25);
        pCat.push(1.0);

        const subNodes = 4;
        const rad = h * 0.45;
        for (let k = 0; k < subNodes; k++) {
          const ang = (k / subNodes) * Math.PI * 2 + (i % 7);
          const sx = p.x + Math.cos(ang) * rad;
          const sz = p.z + Math.sin(ang) * rad;
          const sy = crownY + (k % 2 === 0 ? 0.25 : -0.2);
          const swSub = randomSwarmCluster(currentParticleIndex++);
          pTarget.push(sx, sy, sz);
          pSwarm.push(swSub.x, swSub.y, swSub.z);
          pColor.push(folCol.r * 1.05, folCol.g * 1.05, folCol.b * 1.05);
          pSize.push(1.4);
          pPhase.push(i + k * 1.5);
          pCat.push(1.0);
        }

        const swBase = randomSwarmCluster(currentParticleIndex++);
        pTarget.push(p.x, 0.1, p.z);
        pSwarm.push(swBase.x, swBase.y, swBase.z);
        pColor.push(colTrunk.r, colTrunk.g, colTrunk.b);
        pSize.push(1.1);
        pPhase.push(i * 0.1);
        pCat.push(1.0);
      });
      rebuildTerritoryParticles();
    }).catch(err => console.warn("Error árboles:", err));
  }

  function loadRoads() {
    return fetch(NET_URL).then(r => r.json()).then(edges => {
      const colRoad = new THREE.Color(0x232326);
      const colMajor = new THREE.Color(0x38BDF8);

      edges.forEach(([kind, pts], edgeIdx) => {
        const isMajor = (edgeIdx % 4 === 0);
        const c = isMajor ? colMajor : colRoad;
        for (let i = 0; i < pts.length - 1; i++) {
          const a = toScene(pts[i][0], pts[i][1]);
          const sw = randomSwarmCluster(currentParticleIndex++);
          pTarget.push(a.x, 0.08, a.z);
          pSwarm.push(sw.x, sw.y, sw.z);
          pColor.push(c.r, c.g, c.b);
          pSize.push(isMajor ? 1.25 : 0.95);
          pPhase.push(edgeIdx * 0.35);
          pCat.push(3.0);
        }
      });
      rebuildTerritoryParticles();
    }).catch(err => console.warn("Error vías:", err));
  }

  function loadBuildings() {
    return fetch(BUILDINGS_URL).then(r => r.json()).then(buildings => {
      const colBldgPrimary   = new THREE.Color(0x3A3836);
      const colBldgSecondary = new THREE.Color(0x484440);
      const colRoofHighlight = new THREE.Color(0x544E48);
      const colBaseGround    = new THREE.Color(0x131315);

      buildings.forEach((b, bIdx) => {
        const pts = b.pts;
        if (!pts || pts.length < 3) return;
        const sPts = pts.map(p => toScene(p[0], p[1]));
        const h = (b.height || 10) * SCALE;
        const bldgCol = (bIdx % 2 === 0) ? colBldgPrimary : colBldgSecondary;

        for (let i = 0; i < sPts.length; i++) {
          const p = sPts[i];
          const steps = Math.max(3, Math.floor(h / 1.1));
          for (let step = 0; step <= steps; step++) {
            const y = (step / steps) * h;
            const sw = randomSwarmCluster(currentParticleIndex++);
            pTarget.push(p.x, y, p.z);
            pSwarm.push(sw.x, sw.y, sw.z);
            const isRoof = (step === steps);
            const c = isRoof ? colRoofHighlight : bldgCol;
            pColor.push(c.r, c.g, c.b);
            pSize.push(isRoof ? 1.3 : 1.1);
            pPhase.push(bIdx + step);
            pCat.push(2.0);
          }
        }
      });

      for (let s = 0; s < 3800; s++) {
        const rad = 25 + Math.sqrt(Math.random()) * 210;
        const ang = Math.random() * Math.PI * 2;
        const gx = Math.cos(ang) * rad;
        const gz = Math.sin(ang) * rad;
        const gy = 0.02 + Math.random() * 0.2;
        const sw = randomSwarmCluster(currentParticleIndex++);
        pTarget.push(gx, gy, gz);
        pSwarm.push(sw.x, sw.y, sw.z);
        pColor.push(colBaseGround.r, colBaseGround.g, colBaseGround.b);
        pSize.push(0.92);
        pPhase.push(s * 0.5);
        pCat.push(4.0);
      }

      rebuildTerritoryParticles();
    }).catch(err => console.warn("Error edificios:", err));
  }

  Promise.all([loadWater(), loadTrees(), loadRoads()]).then(() => {
    loadBuildings();
    setTimeout(() => {
      if (loadingVeil) loadingVeil.classList.add("hide");
    }, 300);
  });

  // =====================================================================
  // 5. CONSTELACIÓN GEORREFERENCIADA DE ÁRBOLES EN EL TERRITORIO
  // =====================================================================
  const speciesConstellationGroup = new THREE.Group();
  speciesConstellationGroup.visible = false;
  sceneRoot.add(speciesConstellationGroup);

  let activeConstellationPoints = null;
  let activeConstellationLines = null;
  const activeTreeIndicatorGroup = new THREE.Group();
  sceneRoot.add(activeTreeIndicatorGroup);

  const focusDotGeo = new THREE.CircleGeometry(2.4, 24);
  const focusDotMat = new THREE.MeshBasicMaterial({ color: 0x84A48B, side: THREE.DoubleSide, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending });
  const focusDotMesh = new THREE.Mesh(focusDotGeo, focusDotMat);
  focusDotMesh.rotation.x = -Math.PI / 2;
  activeTreeIndicatorGroup.add(focusDotMesh);

  const focusRingGeo = new THREE.RingGeometry(2.8, 5.4, 24);
  const focusRingMat = new THREE.MeshBasicMaterial({ color: 0x84A48B, side: THREE.DoubleSide, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending });
  const focusRingMesh = new THREE.Mesh(focusRingGeo, focusRingMat);
  focusRingMesh.rotation.x = -Math.PI / 2;
  activeTreeIndicatorGroup.add(focusRingMesh);

  function renderTreeConstellation(specId, colHex) {
    speciesConstellationGroup.clear();
    const cluster = treeSpeciesClusters[specId] || [];
    if (cluster.length === 0) return;

    const sampleSize = Math.min(cluster.length, 750);
    const step = Math.max(1, Math.floor(cluster.length / sampleSize));
    const sampled = [];
    for (let i = 0; i < cluster.length && sampled.length < sampleSize; i += step) {
      sampled.push(cluster[i]);
    }

    const pos = new Float32Array(sampled.length * 3);
    const cols = new Float32Array(sampled.length * 3);
    const colObj = new THREE.Color(colHex);

    for (let i = 0; i < sampled.length; i++) {
      const t = sampled[i];
      pos[i * 3]     = t.x;
      pos[i * 3 + 1] = t.y + 0.2;
      pos[i * 3 + 2] = t.z;
      cols[i * 3]     = colObj.r;
      cols[i * 3 + 1] = colObj.g;
      cols[i * 3 + 2] = colObj.b;
    }

    const cGeo = new THREE.BufferGeometry();
    cGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    cGeo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    const cMat = new THREE.PointsMaterial({ size: 2.8, vertexColors: true, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending });
    activeConstellationPoints = new THREE.Points(cGeo, cMat);
    speciesConstellationGroup.add(activeConstellationPoints);

    const linePairs = [];
    for (let i = 0; i < sampled.length; i++) {
      const a = sampled[i];
      for (let j = i + 1; j < sampled.length; j++) {
        const b = sampled[j];
        const distSq = (a.x - b.x)**2 + (a.z - b.z)**2;
        if (distSq < 180 && linePairs.length < 350) {
          linePairs.push(a.x, a.y + 0.2, a.z, b.x, b.y + 0.2, b.z);
        }
      }
    }

    if (linePairs.length > 0) {
      const lGeo = new THREE.BufferGeometry();
      lGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePairs, 3));
      const lMat = new THREE.LineBasicMaterial({ color: colObj, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending });
      activeConstellationLines = new THREE.LineSegments(lGeo, lMat);
      speciesConstellationGroup.add(activeConstellationLines);
    }

    speciesConstellationGroup.visible = true;

    if (window.gsap) {
      gsap.to(cMat, { opacity: 0.85, duration: 1.2, ease: "power2.out" });
      if (activeConstellationLines) {
        gsap.to(activeConstellationLines.material, { opacity: 0.35, duration: 1.2, ease: "power2.out" });
      }
    }
  }

  // =====================================================================
  // 6. CONTROLADOR BOTÁNICO Y RECORRIDO DE ÁRBOLES EN EL TERRITORIO
  // =====================================================================
  let tourActive = false;
  let tourIndex = 0;
  let tourTimer = null;
  const btnTourSpecies = document.getElementById("btnTourSpecies");

  const SPECIES_GEO_NODES = [
    { id: "chicala", name: "Chicalá / Flor Amarillo", sci: "Tecoma stans", count: "6,884 árboles", avgHeight: "2.6 m (hasta 6 m)", img: "./assets/inat_timboco.png", pos: { x: 210.4, y: 13.0, z: 96.0 }, camPos: { x: 210.4, y: 48, z: 155 }, camTarget: { x: 210.4, y: 0, z: 96.0 }, color: 0xE7C878 },
    { id: "jazmin", name: "Jazmín del Cabo / Laurel Huesito", sci: "Pittosporum undulatum", count: "5,650 árboles", avgHeight: "3.2 m (hasta 9 m)", img: "./assets/inat_sauco.png", pos: { x: 234.8, y: 13.5, z: 102.9 }, camPos: { x: 234.8, y: 50, z: 162 }, camTarget: { x: 234.8, y: 0, z: 102.9 }, color: 0x48BB78 },
    { id: "sauco", name: "Sauco del Humedal", sci: "Sambucus nigra", count: "5,553 árboles", avgHeight: "3.1 m (hasta 8 m)", img: "./assets/inat_sauco.png", pos: { x: 221.0, y: 13.0, z: 124.7 }, camPos: { x: 221.0, y: 48, z: 182 }, camTarget: { x: 221.0, y: 0, z: 124.7 }, color: 0x84A48B },
    { id: "falso_pimiento", name: "Falso Pimiento", sci: "Schinus molle", count: "4,548 árboles", avgHeight: "3.6 m (hasta 10 m)", img: "./assets/inat_espino.png", pos: { x: 192.2, y: 14.0, z: 88.6 }, camPos: { x: 192.2, y: 52, z: 148 }, camTarget: { x: 192.2, y: 0, z: 88.6 }, color: 0x2E8B57 },
    { id: "eugenia", name: "Eugenia", sci: "Eugenia myrtifolia", count: "4,370 árboles", avgHeight: "3.5 m (hasta 8 m)", img: "./assets/inat_chilca.png", pos: { x: 209.7, y: 13.5, z: 78.8 }, camPos: { x: 209.7, y: 50, z: 138 }, camTarget: { x: 209.7, y: 0, z: 78.8 }, color: 0x48BB78 },
    { id: "palma_yuca", name: "Palma Yuca / Palmiche", sci: "Yucca gigantea", count: "4,356 árboles", avgHeight: "2.9 m (hasta 7 m)", img: "./assets/inat_mastuerzo.png", pos: { x: 188.7, y: 12.5, z: 180.1 }, camPos: { x: 188.7, y: 48, z: 240 }, camTarget: { x: 188.7, y: 0, z: 180.1 }, color: 0x84A48B },
    { id: "urapan", name: "Urapán / Fresno", sci: "Fraxinus chinensis", count: "3,113 árboles", avgHeight: "8.5 m (hasta 20 m)", img: "./assets/cx_urapan.png", pos: { x: 251.2, y: 19.0, z: 142.5 }, camPos: { x: 251.2, y: 68, z: 205 }, camTarget: { x: 251.2, y: 0, z: 142.5 }, color: 0x2E8B57 },
    { id: "caucho", name: "Caucho Sabanero", sci: "Ficus soatensis", count: "2,860 árboles", avgHeight: "6.3 m (hasta 15 m)", img: "./assets/inat_espino.png", pos: { x: 172.3, y: 16.0, z: 138.1 }, camPos: { x: 172.3, y: 58, z: 198 }, camTarget: { x: 172.3, y: 0, z: 138.1 }, color: 0x84A48B },
    { id: "cipres", name: "Ciprés / Pino", sci: "Cupressus lusitanica", count: "2,828 árboles", avgHeight: "4.9 m (hasta 16 m)", img: "./assets/arbol_real4.png", pos: { x: 277.8, y: 15.0, z: 124.1 }, camPos: { x: 277.8, y: 55, z: 184 }, camTarget: { x: 277.8, y: 0, z: 124.1 }, color: 0x48BB78 },
    { id: "acacia", name: "Acacia Sabanera", sci: "Acacia melanoxylon", count: "2,160 árboles", avgHeight: "3.9 m (hasta 12 m)", img: "./assets/inat_chilca.png", pos: { x: 166.1, y: 14.0, z: 93.1 }, camPos: { x: 166.1, y: 52, z: 153 }, camTarget: { x: 166.1, y: 0, z: 93.1 }, color: 0x2E8B57 },
    { id: "capulin", name: "Capulí / Cerezo", sci: "Prunus serotina", count: "1,901 árboles", avgHeight: "3.7 m (hasta 12 m)", img: "./assets/inat_capulin.png", pos: { x: 208.9, y: 14.5, z: 141.0 }, camPos: { x: 208.9, y: 52, z: 200 }, camTarget: { x: 208.9, y: 0, z: 141.0 }, color: 0x48BB78 },
    { id: "aliso", name: "Aliso Sabanero", sci: "Alnus acuminata", count: "1,058 árboles", avgHeight: "2.7 m (hasta 12 m)", img: "./assets/inat_chilca.png", pos: { x: 203.4, y: 13.5, z: -102.2 }, camPos: { x: 203.4, y: 50, z: -42 }, camTarget: { x: 203.4, y: 0, z: -102.2 }, color: 0x48BB78 }
  ];

  function focusTreeSpecies(idx) {
    if (idx < 0 || idx >= SPECIES_GEO_NODES.length) return;
    tourIndex = idx;
    const spec = SPECIES_GEO_NODES[idx];

    if (currentMorph < 0.45) {
      animateToStage(1.0);
    }

    if (activeTreeImg) activeTreeImg.src = spec.img;
    if (activeTreeName) activeTreeName.textContent = spec.name.split('/')[0].trim();
    if (activeTreeChip) activeTreeChip.classList.add("show");

    if (window.gsap) {
      gsap.to(camera.position, { x: spec.camPos.x, y: spec.camPos.y, z: spec.camPos.z, duration: 2.5, ease: "power2.inOut" });
      gsap.to(controls.target, { x: spec.camTarget.x, y: spec.camTarget.y, z: spec.camTarget.z, duration: 2.5, ease: "power2.inOut" });
    }

    focusDotMesh.position.set(spec.pos.x, 0.22, spec.pos.z);
    focusRingMesh.position.set(spec.pos.x, 0.24, spec.pos.z);
    const colObj = new THREE.Color(spec.color);
    focusDotMat.color = colObj;
    focusRingMat.color = colObj;

    if (window.gsap) {
      gsap.to(focusDotMat, { opacity: 0.95, duration: 0.4 });
      gsap.to(focusRingMat, { opacity: 0.8, duration: 0.4 });
    }

    renderTreeConstellation(spec.id, spec.color);
    if (soundActive && typeof triggerHarmonicChime === "function") {
      triggerHarmonicChime(0.45 + (idx / SPECIES_GEO_NODES.length) * 0.5);
    }
  }

  function startSpeciesTour() {
    tourActive = true;
    if (btnTourSpecies) btnTourSpecies.classList.add("active");
    focusTreeSpecies(tourIndex);
    clearInterval(tourTimer);
    tourTimer = setInterval(() => {
      if (!tourActive) return;
      tourIndex = (tourIndex + 1) % SPECIES_GEO_NODES.length;
      focusTreeSpecies(tourIndex);
    }, 7000);
  }

  function stopSpeciesTour() {
    tourActive = false;
    clearInterval(tourTimer);
    if (btnTourSpecies) btnTourSpecies.classList.remove("active");
    if (window.gsap) {
      gsap.to(focusDotMat, { opacity: 0.0, duration: 0.4 });
      gsap.to(focusRingMat, { opacity: 0.0, duration: 0.4 });
      if (activeConstellationPoints) gsap.to(activeConstellationPoints.material, { opacity: 0.0, duration: 0.5 });
      if (activeConstellationLines) gsap.to(activeConstellationLines.material, { opacity: 0.0, duration: 0.5 });
    }
  }

  if (btnTourSpecies) {
    btnTourSpecies.addEventListener("click", () => {
      if (tourActive) stopSpeciesTour();
      else startSpeciesTour();
    });
  }

  // =====================================================================
  // 7. INTERACCIÓN DE RED BIÓTICA, INSPECTOR, LAYOUTS Y SUB-RED
  // =====================================================================
  let selectedNode = null;
  let hoveredNode = null;
  const raycaster = new THREE.Raycaster();
  const mouseVec = new THREE.Vector2();

  window.openWelcomeModal = () => {
    const modal = document.getElementById('welcomeModalOverlay');
    if (modal) modal.style.display = 'flex';
  };

  window.closeWelcomeModal = () => {
    const modal = document.getElementById('welcomeModalOverlay');
    if (modal) modal.style.display = 'none';
  };

  window.toggleSideDrawer = () => {
    sideDrawer.classList.toggle('collapsed');
    document.getElementById('btnToggleSide').classList.toggle('active');
  };

  window.toggleCat = (catId) => {
    opts.cats[catId] = !opts.cats[catId];
    const toggleEl = document.getElementById(`toggleCat${catId}`);
    if (toggleEl) toggleEl.classList.toggle('checked', opts.cats[catId]);
    recalculateDegreesAndSizes();
  };

  window.hideNodeByDoubleClick = (node) => {
    if (!node) return;
    node.hiddenByUser = true;
    if (selectedNode && selectedNode.id === node.id) {
      closeInspector();
    }
    recalculateDegreesAndSizes();
    showToast(`Nodo [${node.label}] ocultado por doble clic`);
  };

  window.hideCurrentNode = () => {
    if (selectedNode) hideNodeByDoubleClick(selectedNode);
  };

  window.restoreHiddenNodes = () => {
    rawNodes.forEach(n => n.hiddenByUser = false);
    recalculateDegreesAndSizes();
    showToast('Todos los nodos ocultos fueron restablecidos');
  };

  function showToast(msg) {
    toastNotify.innerText = msg;
    toastNotify.style.display = 'block';
    setTimeout(() => { toastNotify.style.display = 'none'; }, 2500);
  }

  window.resetCamera = () => {
    if (window.gsap) {
      gsap.to(camera.position, { x: swarmCamPos.x, y: swarmCamPos.y, z: swarmCamPos.z, duration: 1.8, ease: "power2.inOut" });
      gsap.to(controls.target, { x: swarmTarget.x, y: swarmTarget.y, z: swarmTarget.z, duration: 1.8, ease: "power2.inOut" });
    }
  };

  window.setLayout = (mode) => {
    opts.layoutMode = mode;
    document.querySelectorAll('#topHeader .btn-flat').forEach(b => {
      if (b.id && b.id.startsWith('btnLayout')) b.classList.remove('active');
    });
    if (mode === 'hyperbolic') document.getElementById('btnLayoutHyp').classList.add('active');
    if (mode === 'clustered') document.getElementById('btnLayoutClust').classList.add('active');
    if (mode === 'concentric') document.getElementById('btnLayoutConc').classList.add('active');

    rawNodes.forEach((n, idx) => {
      if (mode === 'clustered') {
        const centers = {
          0: { x: -28, y: -10, z: -14 },
          1: { x: 28, y: -10, z: 14 },
          2: { x: -28, y: 18, z: 14 },
          3: { x: 28, y: 18, z: -14 }
        };
        const c = centers[n.cat] || { x: 0, y: 0, z: 0 };
        const a = idx * 2.4 + (n.cat * Math.PI / 2);
        const r = 6 + (idx % 12) * 1.1;
        n.ox = c.x + Math.cos(a) * r;
        n.oy = c.y + Math.sin(a * 1.3) * (r * 0.7);
        n.oz = c.z + Math.sin(a) * r;
      } else if (mode === 'concentric') {
        const ringIdx = idx % 3;
        const rad = 18 + ringIdx * 10;
        const posInRing = Math.floor(idx / 3);
        const angle = (posInRing / (rawNodes.length / 3)) * Math.PI * 2;
        n.ox = Math.cos(angle) * rad;
        n.oy = Math.sin(angle * 1.5) * (rad * 0.45);
        n.oz = Math.sin(angle) * rad;
      } else {
        n.ox = n.baseX; n.oy = n.baseY; n.oz = n.baseZ;
      }

      if (window.gsap) {
        gsap.to(n.sprite.position, { x: n.ox, y: n.oy, z: n.oz, duration: 2.2, ease: "power2.inOut" });
      }
    });
  };

  window.searchNode = (q) => {
    if (!q.trim()) return;
    const found = rawNodes.find(n => n.active && (n.label.toLowerCase().includes(q.toLowerCase()) || n.sciname.toLowerCase().includes(q.toLowerCase()) || n.taxaId.toLowerCase() === q.toLowerCase()));
    if (found) openInspector(found);
  };

  window.openInspector = (node) => {
    selectedNode = node;
    document.getElementById('mNodeTitle').innerText = node.label;
    document.getElementById('mNodeSciName').innerText = node.sciname;
    document.getElementById('mDegreeVal').innerText = node.degree;
    document.getElementById('mTaxaCode').innerText = node.taxaId;
    document.getElementById('mRoleBox').innerText = node.role;
    document.getElementById('mLocBox').innerText = node.loc;
    document.getElementById('mAlertBox').innerText = node.alert;

    const imgEl = document.getElementById('mNodeImg');
    if (node.photoUrl) {
      imgEl.src = node.photoUrl;
      imgEl.style.display = 'block';
    } else {
      imgEl.style.display = 'none';
    }

    document.getElementById('mNeighborHeader').innerText = `Interacciones Bióticas Clasificadas (${node.degree})`;
    const listEl = document.getElementById('mNeighborList');
    listEl.innerHTML = '';

    const interactionTypes = [
      { name: 'Depredación', color: '#C96349' },
      { name: 'Herbivoría', color: '#84A48B' },
      { name: 'Dispersión', color: '#E69888' },
      { name: 'Mutualismo', color: '#E7C878' },
      { name: 'Nidificación', color: '#F79E70' },
      { name: 'Visita Floral', color: '#A386A9' },
      { name: 'Anidamiento', color: '#D1A996' },
      { name: 'Parasitismo', color: '#C6B3CA' },
      { name: 'Alelopatía', color: '#6B9080' }
    ];

    node.neighbors.forEach((nb, idx) => {
      let inter = interactionTypes[0];
      if (node.cat === 0 && nb.cat === 1) inter = interactionTypes[5];
      else if (node.cat === 1 && nb.cat === 0) inter = interactionTypes[2];
      else if (node.cat === 1 && nb.cat === 3) inter = interactionTypes[0];
      else if (node.cat === 3 && nb.cat === 0) inter = interactionTypes[1];
      else if (node.cat === 0 && nb.cat === 0) inter = interactionTypes[8];
      else if (node.cat === 2) inter = interactionTypes[3];
      else inter = interactionTypes[(idx + node.id) % interactionTypes.length];

      const item = document.createElement('div');
      item.className = 'neighbor-row';
      item.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:2px;">
          <span><b>${nb.label}</b> (<i>${nb.sciname}</i>)</span>
          <span style="font-size:8.5px; font-weight:700; color:${inter.color}; background:rgba(255,255,255,0.06); padding:1px 5px; border-radius:3px; width:fit-content; border:1px solid ${inter.color};">
            Tipo: ${inter.name}
          </span>
        </div>
        <span style="color:#84a48b; font-size:9px; font-family:monospace;">${nb.taxaId}</span>
      `;
      item.onclick = (e) => {
        e.stopPropagation();
        openInspector(nb);
      };
      listEl.appendChild(item);
    });

    nodeInspector.style.display = 'block';
    focusSelectedNode(node);
  };

  window.closeInspector = () => {
    selectedNode = null;
    nodeInspector.style.display = 'none';
  };

  window.focusSelectedNode = (node) => {
    const target = node || selectedNode;
    if (!target) return;
    if (window.gsap) {
      gsap.to(camera.position, { x: target.sprite.position.x * 1.6, y: target.sprite.position.y * 1.6, z: target.sprite.position.z * 1.6 + 24, duration: 2.0, ease: "power2.inOut" });
      gsap.to(controls.target, { x: target.sprite.position.x, y: target.sprite.position.y, z: target.sprite.position.z, duration: 2.0, ease: "power2.inOut" });
    }
  };

  // Sub-Network Canvas Modal
  let subCanvasAnim = null;
  const subOpts = { interactions: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true } };

  window.openSubNetworkModal = () => {
    if (!selectedNode) return;
    document.getElementById('subModalTitle').innerText = `Sub-Red Directa: ${selectedNode.label}`;
    document.getElementById('subModalCode').innerText = `[${selectedNode.taxaId}]`;
    subnetworkModal.style.display = 'flex';
    renderSubNetworkCanvas();
  };

  window.closeSubNetworkModal = () => {
    subnetworkModal.style.display = 'none';
    if (subCanvasAnim) cancelAnimationFrame(subCanvasAnim);
  };

  window.toggleSubInteraction = (typeId) => {
    subOpts.interactions[typeId] = !subOpts.interactions[typeId];
    const btn = document.getElementById(`subInterToggle${typeId}`);
    if (btn) {
      const isActive = !!subOpts.interactions[typeId];
      btn.classList.toggle('active', isActive);
      btn.style.opacity = isActive ? '1' : '0.3';
    }
    renderSubNetworkCanvas();
  };

  function getInteractionType(nodeA, nodeB, idx) {
    if (nodeA.cat === 0 && nodeB.cat === 1) return 5;
    if (nodeA.cat === 1 && nodeB.cat === 0) return 2;
    if (nodeA.cat === 1 && nodeB.cat === 3) return 0;
    if (nodeA.cat === 3 && nodeB.cat === 0) return 1;
    if (nodeA.cat === 0 && nodeB.cat === 0) return 8;
    if (nodeA.cat === 2) return 3;
    return (idx + nodeA.id) % 9;
  }

  function renderSubNetworkCanvas() {
    if (subCanvasAnim) cancelAnimationFrame(subCanvasAnim);
    const subCanvas = document.getElementById('subCanvas');
    const wrap = subCanvas.parentElement;
    subCanvas.width = wrap.clientWidth;
    subCanvas.height = wrap.clientHeight;
    const sctx = subCanvas.getContext('2d');

    const centerNode = selectedNode;
    if (!centerNode) return;

    const cx = subCanvas.width / 2;
    const cy = subCanvas.height / 2;

    const activeNeighbors = (centerNode.neighbors || []).filter((nb, idx) => {
      if (!nb.active) return false;
      const typeId = getInteractionType(centerNode, nb, idx);
      return subOpts.interactions[typeId] !== false;
    });

    const subNodes = [
      { ...centerNode, sx: cx, sy: cy, targetSx: cx, targetSy: cy, isCenter: true, r: 24 }
    ];

    activeNeighbors.forEach((nb, idx) => {
      const angle = idx * 2.4 + 0.4;
      const dist = 100 + (idx % 4) * 35;
      subNodes.push({
        ...nb,
        sx: cx + (Math.random() - 0.5) * 40,
        sy: cy + (Math.random() - 0.5) * 40,
        targetSx: cx + Math.cos(angle) * dist,
        targetSy: cy + Math.sin(angle) * dist * 0.85,
        isCenter: false,
        r: 16,
        interType: getInteractionType(centerNode, nb, idx)
      });
    });

    const interactionTypes = [
      { name: 'Depredación', color: '#C96349' },
      { name: 'Herbivoría', color: '#84A48B' },
      { name: 'Dispersión', color: '#E69888' },
      { name: 'Mutualismo', color: '#E7C878' },
      { name: 'Nidificación', color: '#F79E70' },
      { name: 'Visita Floral', color: '#A386A9' },
      { name: 'Anidamiento', color: '#D1A996' },
      { name: 'Parasitismo', color: '#C6B3CA' },
      { name: 'Alelopatía', color: '#6B9080' }
    ];

    function loopSub() {
      sctx.fillStyle = '#020408';
      sctx.fillRect(0, 0, subCanvas.width, subCanvas.height);

      subNodes.forEach(sn => {
        sn.sx += (sn.targetSx - sn.sx) * 0.12;
        sn.sy += (sn.targetSy - sn.sy) * 0.12;
      });

      const centerSub = subNodes[0];

      subNodes.forEach((sn, i) => {
        if (i === 0) return;
        const inter = interactionTypes[sn.interType || 0];
        sctx.save();
        sctx.beginPath();
        sctx.moveTo(centerSub.sx, centerSub.sy);
        sctx.lineTo(sn.sx, sn.sy);
        sctx.strokeStyle = inter.color;
        sctx.lineWidth = 2.5;
        sctx.stroke();

        const mx = (centerSub.sx + sn.sx) / 2;
        const my = (centerSub.sy + sn.sy) / 2;
        sctx.font = '9px monospace';
        sctx.fillStyle = '#ffffff';
        sctx.fillText(inter.name, mx - 15, my - 4);
        sctx.restore();
      });

      subNodes.forEach(sn => {
        const r = sn.r;
        sctx.save();
        sctx.beginPath();
        sctx.arc(sn.sx, sn.sy, r, 0, Math.PI * 2);
        sctx.fillStyle = palette.catColors[sn.cat];
        sctx.fill();
        sctx.strokeStyle = sn.isCenter ? '#ffffff' : palette.catColors[sn.cat];
        sctx.lineWidth = sn.isCenter ? 3.5 : 2;
        sctx.stroke();

        sctx.font = sn.isCenter ? '11px monospace' : '9.5px monospace';
        sctx.fillStyle = '#ffffff';
        sctx.fillText(`${sn.label} [${sn.taxaId}]`, sn.sx + r + 6, sn.sy + 4);
        sctx.restore();
      });

      subCanvasAnim = requestAnimationFrame(loopSub);
    }
    loopSub();
  }

  // FAQ Chat Widget Logic
  window.toggleFaqChat = () => {
    faqChatModal.style.display = (faqChatModal.style.display === 'none' || !faqChatModal.style.display) ? 'flex' : 'none';
  };

  window.askFaq = (questionId) => {
    const chatBody = document.getElementById('chatBody');
    let userMsg = '', botMsg = '', targetTaxon = null;

    if (questionId === 1) {
      userMsg = '¿Qué significan las conexiones y evidencia entre especies?';
      const fauna = rawNodes.filter(n => n.cat === 1 || n.cat === 3).sort((a,b) => b.degree - a.degree);
      targetTaxon = fauna[0];
      botMsg = `Las conexiones representan interacciones verificadas respaldadas por SIGAU y censos SDA. El taxón animal de mayor conectividad es <b>${targetTaxon ? targetTaxon.label : 'Mirla patinaranja'}</b> con ${targetTaxon ? targetTaxon.degree : 12} enlaces bióticos.`;
    } else if (questionId === 2) {
      userMsg = '¿Por qué existen relaciones entre vegetación y fauna?';
      const flora = rawNodes.filter(n => n.cat === 0).sort((a,b) => b.degree - a.degree);
      targetTaxon = flora[0];
      botMsg = `Se deben a nodos de flora nativa estructural (como <b>${targetTaxon ? targetTaxon.label : 'Saúco'}</b>), que actúan como 'Hubs' de néctar, frutos y refugio exclusivo para la avifauna de Kennedy.`;
    } else if (questionId === 3) {
      userMsg = 'Conjetura: ¿Qué observaciones son datos vs hipótesis?';
      targetTaxon = rawNodes.find(n => n.taxaId === 'AVE-01');
      botMsg = `<b>Datos verificados:</b> Nidos censados de <i>${targetTaxon ? targetTaxon.label : 'Tingua bogotana'}</i> en juncales. <b>Hipótesis:</b> Inhibición del canto de cortejo por ruido vehicular >75 dB(A) en Av. Cali.`;
    } else if (questionId === 4) {
      userMsg = 'Problemática: ¿Qué dependencias amenazan la sostenibilidad?';
      targetTaxon = rawNodes.find(n => n.cat === 2);
      botMsg = `La dependencia crítica es el balance entre flora filtradora y bacterias nitrificantes (como <i>${targetTaxon ? targetTaxon.label : 'Nitrosomonas'}</i>). La amenaza radica en la eutrofización acelerada en La Vaca y Techo.`;
    }

    const uBubble = document.createElement('div');
    uBubble.className = 'msg-bubble msg-user';
    uBubble.innerText = userMsg;
    chatBody.appendChild(uBubble);

    setTimeout(() => {
      const bBubble = document.createElement('div');
      bBubble.className = 'msg-bubble msg-bot';
      bBubble.innerHTML = botMsg;
      chatBody.appendChild(bBubble);
      chatBody.scrollTop = chatBody.scrollHeight;
      if (targetTaxon) openInspector(targetTaxon);
    }, 250);
  };

  window.sendCustomChatMessage = () => {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    const chatBody = document.getElementById('chatBody');

    const uBubble = document.createElement('div');
    uBubble.className = 'msg-bubble msg-user';
    uBubble.innerText = text;
    chatBody.appendChild(uBubble);
    input.value = '';

    const query = text.toLowerCase();
    let targetTaxon = rawNodes.find(n => n.active && (n.label.toLowerCase().includes(query) || n.sciname.toLowerCase().includes(query) || n.taxaId.toLowerCase() === query));

    let botMsg = '';
    if (targetTaxon) {
      botMsg = `Analizando <b>${targetTaxon.label}</b> (<i>${targetTaxon.sciname}</i>): Cuenta con <b>${targetTaxon.degree} enlaces bióticos</b>. Nicho: ${targetTaxon.role}.`;
    } else {
      targetTaxon = rawNodes.filter(n => n.active).sort((a,b) => b.degree - a.degree)[0];
      botMsg = `He analizado la topología de la red para tu consulta. Te ubico en el nodo de mayor centralidad: <b>${targetTaxon.label}</b> con ${targetTaxon.degree} interacciones activas.`;
    }

    setTimeout(() => {
      const bBubble = document.createElement('div');
      bBubble.className = 'msg-bubble msg-bot';
      bBubble.innerHTML = botMsg;
      chatBody.appendChild(bBubble);
      chatBody.scrollTop = chatBody.scrollHeight;
      if (targetTaxon) openInspector(targetTaxon);
    }, 300);
  };

  // Raycasting Click & Double-Click en Nodos
  let clickTime = 0;
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.glass-panel') || e.target.closest('.welcome-modal') || e.target.closest('.bottom-experience-bar') || e.target.closest('.waypoints-bar') || e.target.closest('#activeTreeChip')) return;

    if (currentMorph > 0.35) return;

    mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouseVec, camera);

    const intersects = raycaster.intersectObjects(nodeSprites, false);
    if (intersects.length > 0) {
      const sp = intersects[0].object;
      const nodeObj = rawNodes[sp.userData.id];
      const now = Date.now();

      if (now - clickTime < 320) {
        // Doble clic: ocultar nodo
        hideNodeByDoubleClick(nodeObj);
      } else {
        // Clic simple: abrir inspector
        openInspector(nodeObj);
      }
      clickTime = now;
    }
  });

  // =====================================================================
  // 8. METAMORFOSIS ANIMADA: RED BIÓTICA <---> TERRITORIO 3D
  // =====================================================================
  let targetMorph = 0.0;
  let currentMorph = 0.0;
  let isTerritory = false;

  const slider = document.getElementById("experienceSlider");
  const btnToggle = document.getElementById("btnPlayTransition");
  const btnActionText = document.getElementById("btnActionText");
  const labelSwarm = document.getElementById("labelSwarm");
  const labelTerritory = document.getElementById("labelTerritory");

  function setMorphValue(val, updateSlider = true) {
    targetMorph = Math.max(0, Math.min(1, val));
    if (updateSlider && slider) slider.value = Math.round(targetMorph * 100);
    isTerritory = targetMorph > 0.45;

    sceneBaseGroup.visible = targetMorph > 0.15;
    networkGroup.visible = targetMorph < 0.35;

    if (btnActionText) {
      btnActionText.textContent = isTerritory ? "DISPERSAR A RED BIÓTICA" : "MATERIALIZAR";
    }
    if (labelSwarm) labelSwarm.classList.toggle("active", targetMorph < 0.2);
    if (labelTerritory) labelTerritory.classList.toggle("active", targetMorph > 0.8);

    // Ocultar / Mostrar paneles de red vs territorio
    if (topHeader) topHeader.style.opacity = targetMorph < 0.15 ? "1" : "0";
    if (topHeader) topHeader.style.pointerEvents = targetMorph < 0.15 ? "auto" : "none";
    if (sideDrawer && targetMorph > 0.15) sideDrawer.classList.add("collapsed");
    if (chatWidgetBtn) chatWidgetBtn.style.display = targetMorph < 0.15 ? "flex" : "none";
    if (nodeInspector && targetMorph > 0.15) closeInspector();
    if (subnetworkModal && targetMorph > 0.15) closeSubNetworkModal();

    if (waypointsBar) waypointsBar.classList.toggle("show", targetMorph > 0.65);
    if (targetMorph < 0.25) {
      if (activeTreeChip) activeTreeChip.classList.remove("show");
      if (tourActive) stopSpeciesTour();
    }

    if (soundActive && typeof triggerHarmonicChime === "function") {
      triggerHarmonicChime(targetMorph);
    }
  }

  function animateToStage(dest) {
    if (!window.gsap) { setMorphValue(dest); return; }

    const endPos = (dest === 1.0) ? territoryCamPos : swarmCamPos;
    const endTarget = (dest === 1.0) ? territoryTarget : swarmTarget;

    particleUniforms.uRipplePos.value.set(0, 0, 0);
    particleUniforms.uRippleTime.value = 0.0;

    gsap.killTweensOf(particleUniforms.uRippleTime);
    gsap.to(particleUniforms.uRippleTime, { value: 1.8, duration: 3.2, ease: "power2.out" });

    const morphObj = { val: currentMorph };
    gsap.to(morphObj, {
      val: dest,
      duration: 3.2,
      ease: "power3.inOut",
      onUpdate: () => setMorphValue(morphObj.val, true)
    });

    gsap.to(camera.position, { x: endPos.x, y: endPos.y, z: endPos.z, duration: 3.2, ease: "power3.inOut" });
    gsap.to(controls.target, { x: endTarget.x, y: endTarget.y, z: endTarget.z, duration: 3.2, ease: "power3.inOut" });

    gsap.to(camera, { fov: 44, duration: 3.2, ease: "power3.inOut", onUpdate: () => camera.updateProjectionMatrix() });
    gsap.to(particleUniforms.uPerspectiveMode, { value: 0.0, duration: 2.5 });
  }

  if (slider) {
    slider.addEventListener("input", (e) => setMorphValue(parseFloat(e.target.value) / 100, false));
  }
  if (btnToggle) {
    btnToggle.addEventListener("click", () => animateToStage(isTerritory ? 0.0 : 1.0));
  }
  if (labelSwarm) labelSwarm.addEventListener("click", () => animateToStage(0.0));
  if (labelTerritory) labelTerritory.addEventListener("click", () => animateToStage(1.0));

  // Waypoints con soporte de Perspectiva Humana e interpolación FOV
  document.querySelectorAll(".waypoint-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".waypoint-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      const wpKey = pill.getAttribute("data-waypoint");
      const wp = waypoints[wpKey];
      if (wp && window.gsap) {
        const isPersp = (wpKey === "perspective");
        gsap.to(camera.position, { x: wp.pos.x, y: wp.pos.y, z: wp.pos.z, duration: 2.6, ease: "power2.inOut" });
        gsap.to(controls.target, { x: wp.target.x, y: wp.target.y, z: wp.target.z, duration: 2.6, ease: "power2.inOut" });
        gsap.to(camera, { fov: wp.fov || 44, duration: 2.6, ease: "power2.inOut", onUpdate: () => camera.updateProjectionMatrix() });
        gsap.to(particleUniforms.uPerspectiveMode, { value: isPersp ? 1.0 : 0.0, duration: 2.2, ease: "power2.inOut" });
        if (soundActive && typeof triggerWaterResonance === "function" && isPersp) {
          triggerWaterResonance();
        }
      }
    });
  });

  // Camera Helper Inspector
  function updateCamInspectorDisplay() {
    if (!camInspectorBox || camInspectorBox.classList.contains("hidden")) return;
    if (camCoordPos) camCoordPos.textContent = `X:${camera.position.x.toFixed(1)}, Y:${camera.position.y.toFixed(1)}, Z:${camera.position.z.toFixed(1)}`;
    if (camCoordTarget) camCoordTarget.textContent = `X:${controls.target.x.toFixed(1)}, Y:${controls.target.y.toFixed(1)}, Z:${controls.target.z.toFixed(1)}`;
  }
  controls.addEventListener("change", updateCamInspectorDisplay);

  if (btnSaveCameraView) {
    btnSaveCameraView.addEventListener("click", () => {
      const savedState = {
        pos: { x: Number(camera.position.x.toFixed(2)), y: Number(camera.position.y.toFixed(2)), z: Number(camera.position.z.toFixed(2)) },
        target: { x: Number(controls.target.x.toFixed(2)), y: Number(controls.target.y.toFixed(2)), z: Number(controls.target.z.toFixed(2)) }
      };
      try {
        localStorage.setItem("saved_territory_cam", JSON.stringify(savedState));
        localStorage.setItem("hide_cam_helper", "true");
      } catch(e){}
      territoryCamPos.set(savedState.pos.x, savedState.pos.y, savedState.pos.z);
      territoryTarget.set(savedState.target.x, savedState.target.y, savedState.target.z);
      waypoints.overview.pos = territoryCamPos;
      waypoints.overview.target = territoryTarget;

      if (camToast) {
        camToast.style.opacity = "1";
        setTimeout(() => { camToast.style.opacity = "0"; }, 3500);
      }
      if (camInspectorBox) camInspectorBox.classList.add("hidden");
    });
  }

  if (btnCloseCamInspector) {
    btnCloseCamInspector.addEventListener("click", () => {
      if (camInspectorBox) camInspectorBox.classList.add("hidden");
      try { localStorage.setItem("hide_cam_helper", "true"); } catch(e){}
    });
  }

  // =====================================================================
  // 9. SÍNTESIS DE AUDIO WEB (ECOSISTEMA, AGUA & PAISAJE SONORO)
  // =====================================================================
  let audioCtx = null;
  let soundActive = false;
  let masterGain = null;

  function initBioAudio() {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);
    } catch(e) { console.warn("Audio no disponible:", e); }
  }

  function triggerHarmonicChime(freqMultiplier = 0.5) {
    if (!audioCtx || !soundActive) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      const baseFreq = 240 + freqMultiplier * 460;
      osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, audioCtx.currentTime + 1.2);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.6);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.6);
    } catch(e){}
  }

  function triggerWaterResonance() {
    if (!audioCtx || !soundActive) return;
    try {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          if (!audioCtx) return;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          const f = 520 + Math.random() * 380;
          osc.frequency.setValueAtTime(f, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(f * 0.7, audioCtx.currentTime + 0.35);
          gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.35);
        }, i * 140);
      }
    } catch(e){}
  }

  const soundToggle = document.getElementById("soundToggle");
  if (soundToggle) {
    soundToggle.addEventListener("click", () => {
      initBioAudio();
      soundActive = !soundActive;
      soundToggle.classList.toggle("active", soundActive);
      soundToggle.innerHTML = soundActive ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
      if (soundActive && audioCtx.state === "suspended") audioCtx.resume();
      if (soundActive) triggerHarmonicChime(0.6);
    });
  }

  // =====================================================================
  // 10. BUCLE PRINCIPAL DE ANIMACIÓN
  // =====================================================================
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    currentMorph += (targetMorph - currentMorph) * (1.0 - Math.exp(-delta * 5.0));
    particleUniforms.uMorphProgress.value = currentMorph;
    particleUniforms.uTime.value = time;

    // Rotación suave del enjambre biótico en modo Red
    if (opts.autoRotate && currentMorph < 0.25 && !selectedNode) {
      networkGroup.rotation.y += 0.0025;
      networkGroup.rotation.x = Math.sin(time * 0.5) * 0.03;
    }

    // Animación de pulso del árbol activo en territorio
    if (focusRingMat.opacity > 0.05) {
      focusRingMesh.rotation.z = -time * 0.45;
      const groundScale = 1.0 + Math.sin(time * 3.2) * 0.15;
      focusRingMesh.scale.set(groundScale, groundScale, 1.0);
    }
    if (activeConstellationPoints && activeConstellationPoints.material.opacity > 0.05) {
      activeConstellationPoints.material.size = 2.8 + Math.sin(time * 2.5) * 0.45;
    }

    controls.update();
    updateCamInspectorDisplay();
    renderer.render(scene, camera);
  }

  animate();
})();
