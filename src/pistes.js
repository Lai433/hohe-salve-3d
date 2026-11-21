import * as Cesium from "cesium";
import { getLineMidpoint } from "./getLineMidpoint.js";

const polygonColor = Cesium.Color.CYAN.withAlpha(0.9);

const difficulties = new Map([
  ["easy", { label: "Leicht", color: Cesium.Color.BLUE }],
  ["intermediate", { label: "Mittelschwer", color: Cesium.Color.RED }],
  ["advanced", { label: "Schwer", color: Cesium.Color.BLACK }],
  ["novice", { label: "Anfänger", color: Cesium.Color.GREEN }],
  ["freeride", { label: "Freeride", color: Cesium.Color.RED, dashed: true }],
  ["other", { label: "Sonstige / ohne Angabe", color: Cesium.Color.YELLOW }],
]);

function makePisteCodeImage(code, color) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const font = "bold 28px sans-serif";
  context.font = font;
  const diameter = Math.max(60, Math.ceil(context.measureText(code).width) + 20);
  canvas.width = diameter;
  canvas.height = diameter;

  const center = diameter / 2;
  context.beginPath();
  context.arc(center, center, center - 2, 0, Cesium.Math.TWO_PI);
  context.fillStyle = color.toCssColorString();
  context.fill();
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.lineWidth = 3;
  context.strokeStyle = "rgba(0, 0, 0, 0.7)";
  context.strokeText(code, center, center);
  context.fillStyle = "white";
  context.fillText(code, center, center);
  return canvas;
}

export async function loadPistes(viewer, panel) {
  panel.innerHTML = `
    <label><input type="checkbox" data-layer="lines" checked> Pistenlinien</label>
    <details class="layer-filters">
      <summary id="piste-difficulty-heading">Schwierigkeit der Pistenlinien</summary>
      <div class="layer-filter-options" role="group" aria-labelledby="piste-difficulty-heading">
        ${Array.from(difficulties, ([value, { label, color, dashed }]) => `
          <label>
            <input type="checkbox" data-difficulty="${value}" checked>
            <span class="piste-color${dashed ? " piste-color-dashed" : ""}" style="--piste-color: ${color.toCssColorString()}" aria-hidden="true"></span>
            ${label}
          </label>
        `).join("")}
      </div>
    </details>
    <label>
      <input type="checkbox" data-layer="polygons" checked>
      <span class="piste-color" style="--piste-color: ${polygonColor.toCssColorString()}" aria-hidden="true"></span>
      Pistenflächen
    </label>
    <output role="status">GeoJSON wird geladen …</output>
  `;
  const status = panel.querySelector("output");
  try {
    const [polygons, lines] = await Promise.all([
      Cesium.GeoJsonDataSource.load(`${import.meta.env.BASE_URL}data/piste_polygon.geojson`, {
        clampToGround: true,
      }),
      Cesium.GeoJsonDataSource.load(`${import.meta.env.BASE_URL}data/piste_linie.geojson`, {
        clampToGround: true,
      }),
    ]);
    polygons.name = "Pistenflächen";
    lines.name = "Pistenlinien";
    const time = viewer.clock.currentTime;
    for (const entity of polygons.entities.values) {
      entity.name = `${entity.properties?.ref?.getValue(time) ?? "–"} · ${entity.properties?.name?.getValue(time) ?? "Piste"}`;
      entity.polygon.material = polygonColor;
      entity.polygon.outline = false;
      entity.polygon.classificationType = Cesium.ClassificationType.TERRAIN;
      entity.polygon.zIndex = 0;
    }
    const lineDifficulties = new Map();
    for (const entity of lines.entities.values) {
      const value = entity.properties?.["piste:difficulty"]?.getValue(time);
      const difficulty = difficulties.has(value) ? value : "other";
      lineDifficulties.set(entity, difficulty);
      const ref = entity.properties?.ref?.getValue(time);
      entity.name = `${ref ?? "–"} · ${entity.properties?.name?.getValue(time) ?? "Piste"}`;
      entity.polyline.clampToGround = true;
      entity.polyline.width = 3;
      const { color, dashed } = difficulties.get(difficulty);
      entity.polyline.material = dashed
        ? new Cesium.PolylineDashMaterialProperty({ color })
        : color;
      entity.polyline.classificationType = Cesium.ClassificationType.TERRAIN;
      entity.polyline.zIndex = 1;
      const code = String(ref ?? "").split(",", 1)[0].trim();
      if (code) {
        entity.position = getLineMidpoint(entity.polyline.positions.getValue(time));
        entity.billboard = new Cesium.BillboardGraphics({
          image: makePisteCodeImage(code, color),
          scale: 0.5,
          heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN,
        });
      }
    }
    await viewer.dataSources.add(polygons);
    await viewer.dataSources.add(lines);
    // Keep both piste layers below the lifts even when the lifts load first.
    viewer.dataSources.lowerToBottom(lines);
    viewer.dataSources.lowerToBottom(polygons);
    const update = () => {
      lines.show = panel.querySelector('[data-layer="lines"]').checked;
      polygons.show = panel.querySelector('[data-layer="polygons"]').checked;
      const selectedDifficulties = new Set(
        Array.from(panel.querySelectorAll("[data-difficulty]:checked"), (input) => input.dataset.difficulty),
      );
      for (const [entity, difficulty] of lineDifficulties) {
        entity.show = selectedDifficulties.has(difficulty);
      }
      viewer.scene.requestRender();
    };
    panel.addEventListener("change", update);
    update();
    status.textContent = `Geladen: ${lines.entities.values.length} Linien / ${polygons.entities.values.length} Flächen.`;
  } catch (error) {
    status.textContent = "Pisten konnten nicht geladen werden. Bitte neu laden.";
    console.error("Failed to load piste GeoJSON:", error);
  }
}
