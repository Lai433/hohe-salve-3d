import * as Cesium from "cesium";

const pointColor = Cesium.Color.fromCssColorString("#16a34a");
const pointOutline = Cesium.Color.fromCssColorString("#14532d");

export async function loadStations(viewer, objectControls) {
  const panel = document.createElement("div");
  panel.className = "layer-controls";
  panel.innerHTML = `
    <label><input type="checkbox" data-layer="stations" checked> Station</label>
    <details class="layer-filters">
      <summary id="station-type-heading">Stationsarten</summary>
      <div class="layer-filter-options" role="group" aria-labelledby="station-type-heading">
        <label>
          <input type="checkbox" data-layer="station-points" checked>
          <span class="station-point" style="background-color: ${pointColor.toCssColorString()}" aria-hidden="true"></span>
          Punkte
        </label>
      </div>
    </details>
    <output role="status">Stationspunkte werden geladen …</output>
  `;
  objectControls.append(panel);

  const stationToggle = panel.querySelector('[data-layer="stations"]');
  const pointsToggle = panel.querySelector('[data-layer="station-points"]');
  const status = panel.querySelector("output");
  try {
    const points = await Cesium.GeoJsonDataSource.load(
      `${import.meta.env.BASE_URL}data/station_punkte.geojson`,
      {
        clampToGround: true,
        credit: new Cesium.Credit(
          '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>',
          true,
        ),
      },
    );
    points.name = "Liftstationspunkte";
    for (const entity of points.entities.values) {
      entity.billboard = undefined;
      entity.point = new Cesium.PointGraphics({
        color: pointColor,
        pixelSize: 11,
        outlineColor: pointOutline,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN,
      });
    }
    await viewer.dataSources.add(points);

    const update = () => {
      points.show = stationToggle.checked && pointsToggle.checked;
      viewer.scene.requestRender();
    };
    panel.addEventListener("change", update);
    update();
    status.textContent = `Geladen: ${points.entities.values.length} Stationspunkte.`;
  } catch (error) {
    status.textContent = "Stationspunkte konnten nicht geladen werden. Bitte neu laden.";
    console.error("Failed to load station points GeoJSON:", error);
  }
}
