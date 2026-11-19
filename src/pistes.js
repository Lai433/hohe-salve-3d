import * as Cesium from "cesium";

const difficulties = new Map([
  ["easy", { label: "Leicht", color: Cesium.Color.BLUE }],
  ["intermediate", { label: "Mittelschwer", color: Cesium.Color.RED }],
  ["advanced", { label: "Schwer", color: Cesium.Color.BLACK }],
  ["novice", { label: "Anfänger", color: Cesium.Color.YELLOW }],
  ["freeride", { label: "Freeride", color: Cesium.Color.YELLOW }],
  ["other", { label: "Sonstige / ohne Angabe", color: Cesium.Color.YELLOW }],
]);

export async function loadPistes(viewer) {
  const panel = document.createElement("section");
  panel.className = "piste-controls";
  panel.setAttribute("aria-labelledby", "object-controls-heading");
  panel.innerHTML = `
    <h2 id="object-controls-heading">Objekte auswählen</h2>
    <label><input type="checkbox" data-layer="lines" checked> Pistenlinien</label>
    <label><input type="checkbox" data-layer="polygons" checked> Pistenflächen</label>
    <fieldset class="piste-difficulties">
      <legend>Schwierigkeit der Pistenlinien</legend>
      ${Array.from(difficulties, ([value, { label, color }]) => `
        <label>
          <input type="checkbox" data-difficulty="${value}" checked>
          <span class="piste-color" style="background-color: ${color.toCssColorString()}" aria-hidden="true"></span>
          ${label}
        </label>
      `).join("")}
    </fieldset>
    <output role="status">GeoJSON wird geladen …</output>
  `;
  document.body.append(panel);
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
      entity.polygon.material = Cesium.Color.CYAN.withAlpha(0.85);
      entity.polygon.outline = false;
      entity.polygon.classificationType = Cesium.ClassificationType.TERRAIN;
      entity.polygon.zIndex = 0;
    }
    const lineDifficulties = new Map();
    for (const entity of lines.entities.values) {
      const value = entity.properties?.["piste:difficulty"]?.getValue(time);
      const difficulty = difficulties.has(value) ? value : "other";
      lineDifficulties.set(entity, difficulty);
      entity.name = `${entity.properties?.ref?.getValue(time) ?? "–"} · ${entity.properties?.name?.getValue(time) ?? "Piste"}`;
      entity.polyline.clampToGround = true;
      entity.polyline.width = 3;
      entity.polyline.material = difficulties.get(difficulty).color;
      entity.polyline.classificationType = Cesium.ClassificationType.TERRAIN;
      entity.polyline.zIndex = 1;
    }
    await viewer.dataSources.add(polygons);
    await viewer.dataSources.add(lines);
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
