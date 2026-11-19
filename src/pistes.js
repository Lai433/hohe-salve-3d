import * as Cesium from "cesium";

export async function loadPistes(viewer) {
  const panel = document.createElement("section");
  panel.className = "piste-controls";
  panel.setAttribute("aria-labelledby", "object-controls-heading");
  panel.innerHTML = `
    <h2 id="object-controls-heading">Objekte auswählen</h2>
    <label><input type="checkbox" data-layer="lines" checked> Pistenlinien</label>
    <label><input type="checkbox" data-layer="polygons" checked> Pistenflächen</label>
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
      entity.polygon.material = Cesium.Color.CYAN.withAlpha(0.35);
      entity.polygon.outline = false;
      entity.polygon.classificationType = Cesium.ClassificationType.TERRAIN;
      entity.polygon.zIndex = 0;
    }
    for (const entity of lines.entities.values) {
      entity.name = `${entity.properties?.ref?.getValue(time) ?? "–"} · ${entity.properties?.name?.getValue(time) ?? "Piste"}`;
      entity.polyline.clampToGround = true;
      entity.polyline.width = 3;
      entity.polyline.material = Cesium.Color.YELLOW;
      entity.polyline.classificationType = Cesium.ClassificationType.TERRAIN;
      entity.polyline.zIndex = 1;
    }
    await viewer.dataSources.add(polygons);
    await viewer.dataSources.add(lines);
    const update = () => {
      lines.show = panel.querySelector('[data-layer="lines"]').checked;
      polygons.show = panel.querySelector('[data-layer="polygons"]').checked;
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
