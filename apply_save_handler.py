import re

with open(r"C:\Users\ACER\.gemini\antigravity\scratch\humedalburro\modulo-10-corte.js", "r", encoding="utf-8") as f:
    js = f.read()

old_end = """const btnZoomOutSec = document.getElementById("btnZoomOutSec");
const btnZoomInSec = document.getElementById("btnZoomInSec");

if (btnZoomOutSec && btnZoomInSec && typeof sectionCamera !== 'undefined') {
    btnZoomOutSec.addEventListener("click", () => {
        sectionCamera.fov = Math.min(100, sectionCamera.fov + 2);
        sectionCamera.updateProjectionMatrix();
    });
    btnZoomInSec.addEventListener("click", () => {
        sectionCamera.fov = Math.max(2, sectionCamera.fov - 2);
        sectionCamera.updateProjectionMatrix();
    });
}"""

new_end = """const btnZoomOutSec = document.getElementById("btnZoomOutSec");
const btnZoomInSec = document.getElementById("btnZoomInSec");
const sectionZoomValEl = document.getElementById("sectionZoomVal");
const botBoxOutputEl = document.getElementById("botBoxOutput");
const btnSaveSectionPermanentEl = document.getElementById("btnSaveSectionPermanent");
const botSavedBadgeEl = document.getElementById("botSavedBadge");

function updateSectionCoordsDisplay() {
  if (typeof sectionCamera === 'undefined') return;
  const pos = sectionCamera.position;
  const tgt = (typeof sectionControls !== 'undefined' && sectionControls) ? sectionControls.target : { x: 182.4, y: 4.2, z: -35.7 };
  const zoomFactor = (12 / (sectionCamera.fov || 12)).toFixed(2);
  if (sectionZoomValEl) sectionZoomValEl.textContent = zoomFactor + "x";
  if (botBoxOutputEl) {
    botBoxOutputEl.value = `// Vista Corte Guardada:\npos: { x: ${pos.x.toFixed(1)}, y: ${pos.y.toFixed(1)}, z: ${pos.z.toFixed(1)} }\ntarget: { x: ${tgt.x.toFixed(1)}, y: ${tgt.y.toFixed(1)}, z: ${tgt.z.toFixed(1)} }\nfov: ${(sectionCamera.fov || 12).toFixed(1)}, zoom: ${(sectionCamera.zoom || 0.8).toFixed(2)}`;
  }
}

if (btnZoomOutSec && btnZoomInSec && typeof sectionCamera !== 'undefined') {
    btnZoomOutSec.addEventListener("click", () => {
        sectionCamera.fov = Math.min(60, sectionCamera.fov + 1.5);
        sectionCamera.updateProjectionMatrix();
        updateSectionCoordsDisplay();
    });
    btnZoomInSec.addEventListener("click", () => {
        sectionCamera.fov = Math.max(3, sectionCamera.fov - 1.5);
        sectionCamera.updateProjectionMatrix();
        updateSectionCoordsDisplay();
    });
}

if (btnSaveSectionPermanentEl && typeof sectionCamera !== 'undefined') {
  btnSaveSectionPermanentEl.addEventListener("click", () => {
    const pos = sectionCamera.position;
    const tgt = (typeof sectionControls !== 'undefined' && sectionControls) ? sectionControls.target : { x: 182.4, y: 4.2, z: -35.7 };
    const config = {
      x: parseFloat(pos.x.toFixed(2)),
      y: parseFloat(pos.y.toFixed(2)),
      z: parseFloat(pos.z.toFixed(2)),
      targetX: parseFloat(tgt.x.toFixed(2)),
      targetY: parseFloat(tgt.y.toFixed(2)),
      targetZ: parseFloat(tgt.z.toFixed(2)),
      fov: parseFloat(sectionCamera.fov.toFixed(2)),
      zoom: parseFloat(sectionCamera.zoom.toFixed(2))
    };
    localStorage.setItem('savedBotSectionView', JSON.stringify(config));
    if (botSavedBadgeEl) {
      botSavedBadgeEl.style.display = "inline-block";
      setTimeout(() => { botSavedBadgeEl.style.display = "none"; }, 3000);
    }
    btnSaveSectionPermanentEl.innerHTML = '<i class="fa-solid fa-check"></i> ¡Vista Guardada para Siempre!';
    setTimeout(() => {
      btnSaveSectionPermanentEl.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Dejar así para siempre';
    }, 2500);
    if (navigator.clipboard && botBoxOutputEl) {
      navigator.clipboard.writeText(botBoxOutputEl.value).catch(() => {});
    }
  });
}

// Update coordinates periodically on control interaction
setInterval(updateSectionCoordsDisplay, 500);"""

if old_end in js:
    js = js.replace(old_end, new_end)
else:
    js += "\n\n" + new_end

with open(r"C:\Users\ACER\.gemini\antigravity\scratch\humedalburro\modulo-10-corte.js", "w", encoding="utf-8") as f:
    f.write(js)

print("Updated section buttons and save handler successfully!")
