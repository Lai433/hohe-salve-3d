import * as Cesium from "cesium";

// Match the complete piste reference: 42a must remain separate from 42.
function isPiste42(entity, time) {
  const ref = entity.properties?.ref?.getValue(time);
  return String(ref ?? "").split(/[,;]/).some((value) => value.trim() === "42");
}

export async function loadPistes(viewer) {
  const panel = document.createElement("section");
  panel.className = "piste-controls";
  panel.setAttribute("aria-label", "Pistenvergleich");
  panel.innerHTML = `
    <strong>42 · Black Eagle</strong>
    <span class="piste-legend">Gelbe Linie · türkise Fläche (35 %)</span>
    <label><input type="checkbox" data-layer="lines" checked> Pistenlinien</label>
    <label><input type="checkbox" data-layer="polygons" checked> Pistenflächen</label>
    <label><input type="checkbox" data-layer="focus" checked> Nur Piste 42</label>
    <button type="button" disabled>Zu Piste 42</button>
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
      entity.polyline.width = isPiste42(entity, time) ? 5 : 3;
      entity.polyline.material = Cesium.Color.YELLOW;
      entity.polyline.classificationType = Cesium.ClassificationType.TERRAIN;
      entity.polyline.zIndex = 1;
    }
    await viewer.dataSources.add(polygons);
    await viewer.dataSources.add(lines);
    const focusEntities = [...lines.entities.values, ...polygons.entities.values]
      .filter((entity) => isPiste42(entity, time));
    const focusLines = lines.entities.values.filter((entity) => isPiste42(entity, time));
    const focusPolygons = polygons.entities.values.filter((entity) => isPiste42(entity, time));
    const only42 = panel.querySelector('[data-layer="focus"]');
    const update = () => {
      lines.show = panel.querySelector('[data-layer="lines"]').checked;
      polygons.show = panel.querySelector('[data-layer="polygons"]').checked;
      for (const source of [lines, polygons]) {
        for (const entity of source.entities.values) {
          entity.show = !only42.checked || isPiste42(entity, time);
        }
      }
      viewer.scene.requestRender();
    };
    panel.addEventListener("change", update);
    update();
    const focusButton = panel.querySelector("button");
    if (!focusLines.length || !focusPolygons.length) {
      status.textContent = "Piste 42 fehlt in einem der beiden Layer.";
      return;
    }
    const flyTo42 = () => viewer.flyTo(focusEntities, {
      duration: 1.5,
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-55), 0),
    });
    focusButton.disabled = false;
    focusButton.addEventListener("click", flyTo42);
    status.textContent = `Geladen: ${lines.entities.values.length} Linien / ${polygons.entities.values.length} Flächen. Piste 42: ${focusLines.length} Linie / ${focusPolygons.length} Fläche.`;
  } catch (error) {
    status.textContent = "Pisten konnten nicht geladen werden. Bitte neu laden.";
    console.error("Failed to load piste GeoJSON:", error);
  }
}
