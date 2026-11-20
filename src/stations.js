import * as Cesium from "cesium";

export async function loadStations(viewer, objectControls) {
  const panel = document.createElement("details");
  panel.className = "layer-filters station-controls";
  panel.open = true;
  panel.innerHTML = `
    <summary>Station</summary>
    <div class="layer-filter-options">
      <label><input type="checkbox" data-layer="station-points" checked> Punkte</label>
      <output role="status">Stationspunkte werden geladen …</output>
    </div>
  `;
  objectControls.append(panel);

  const toggle = panel.querySelector('[data-layer="station-points"]');
  const status = panel.querySelector("output");
  try {
    const points = await Cesium.GeoJsonDataSource.load(
      `${import.meta.env.BASE_URL}data/station_punkte.geojson`,
      {
        markerColor: Cesium.Color.fromCssColorString("#d97706"),
        markerSize: 24,
        clampToGround: true,
        credit: new Cesium.Credit(
          '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>',
          true,
        ),
      },
    );
    points.name = "Liftstationspunkte";
    points.show = toggle.checked;
    await viewer.dataSources.add(points);

    const update = () => {
      points.show = toggle.checked;
      viewer.scene.requestRender();
    };
    toggle.addEventListener("change", update);
    update();
    status.textContent = `Geladen: ${points.entities.values.length} Stationspunkte.`;
  } catch (error) {
    status.textContent = "Stationspunkte konnten nicht geladen werden. Bitte neu laden.";
    console.error("Failed to load station points GeoJSON:", error);
  }
}
