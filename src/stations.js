import * as Cesium from "cesium";
import { buildingColor, styleStationBuildings } from "./stationBuildings.js";

const pointColor = Cesium.Color.fromCssColorString("#16a34a");
const pointOutline = Cesium.Color.fromCssColorString("#14532d");
const stationCredit = new Cesium.Credit(
  '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>',
  true,
);

function styleStationPoints(_viewer, points) {
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
}

const stationLayers = [
  {
    key: "station-points",
    label: "Liftstationsknoten",
    file: "station_punkte.geojson",
    color: pointColor,
    configure: styleStationPoints,
  },
  {
    key: "station-buildings",
    label: "Stationsgebäude",
    file: "station_polygon.geojson",
    color: buildingColor,
    configure: styleStationBuildings,
  },
];

export async function loadStations(viewer, objectControls) {
  const panel = document.createElement("div");
  panel.className = "layer-controls";
  panel.innerHTML = `
    <label><input type="checkbox" data-layer="stations" checked> Station</label>
    <details class="layer-filters">
      <summary id="station-type-heading">Stationsarten</summary>
      <div class="layer-filter-options" role="group" aria-labelledby="station-type-heading">
        ${stationLayers.map(({ key, label, color }) => `
          <label>
            <input type="checkbox" data-layer="${key}" checked>
            <span class="${key === "station-points" ? "station-point" : "piste-color"}" style="--piste-color: ${color.toCssColorString()}" aria-hidden="true"></span>
            ${label}
          </label>
        `).join("")}
      </div>
    </details>
    <output role="status">Stationsdaten werden geladen …</output>
  `;
  objectControls.append(panel);

  const stationToggle = panel.querySelector('[data-layer="stations"]');
  const status = panel.querySelector("output");
  const layers = new Map();
  const update = () => {
    for (const [toggle, layer] of layers) {
      layer.show = stationToggle.checked && toggle.checked;
    }
    viewer.scene.requestRender();
  };
  panel.addEventListener("change", update);

  const messages = await Promise.all(
    stationLayers.map(async ({ key, label, file, configure }) => {
      try {
        const layer = await Cesium.GeoJsonDataSource.load(
          `${import.meta.env.BASE_URL}data/${file}`,
          { clampToGround: true, credit: stationCredit },
        );
        layer.name = label;
        const count = layer.entities.values.length;
        configure(viewer, layer);
        const toggle = panel.querySelector(`[data-layer="${key}"]`);
        layers.set(toggle, layer);
        update();
        await viewer.dataSources.add(layer);
        viewer.scene.requestRender();
        return `${count} ${label}`;
      } catch (error) {
        console.error(`Failed to load ${file}:`, error);
        return `${label} konnten nicht geladen werden`;
      }
    }),
  );
  status.textContent = messages.join(" / ");
}
