import * as Cesium from "cesium";
import { getLineMidpoint } from "./getLineMidpoint.js";

const aerialwayStyles = new Map([
  ["gondola", { label: "Gondelbahn", color: "#006b4f" }],
  ["chair_lift", { label: "Sessellift", color: "#238636" }],
  ["platter", { label: "Tellerlift", color: "#759c18" }],
  ["magic_carpet", { label: "Zauberteppich", color: "#52b82c" }],
  ["other", { label: "Sonstige / ohne Angabe", color: "#365848" }],
]);

// White line drawings in a 24 × 24 coordinate space.
const aerialwayIcons = {
  gondola: "M3 3h18 M12 3v4 M7 7h10l4 5v7l-3 3H6l-3-3v-7Z M4 14h16 M12 8v6",
  chair_lift: "M3 3h18 M16 3v4l-3 3v8 M5 10v8h13v4 M7 18v4 M5 15h9",
  platter: "M3 3h18 M13 3l-3 15 M5 18h10v2a5 2 0 0 1-10 0Z",
  magic_carpet: "M3 16h18v4H3Z M7 20v2 M17 20v2 M6 11l4-4 4 4 M10 7v6 M15 9l3-3 3 3",
  other: "M3 4h18 M12 4v5 M8 13a4 4 0 1 1 8 0 4 4 0 1 1-8 0",
};

function makeAerialwayBadge(type, color, occupancy) {
  const canvas = document.createElement("canvas");
  canvas.width = 80;
  canvas.height = 80;
  const context = canvas.getContext("2d");
  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.translate(occupancy ? 8 : 22, 22);
  context.scale(1.5, 1.5);
  context.strokeStyle = "white";
  context.lineWidth = 1.7;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.stroke(new Path2D(aerialwayIcons[type]));
  context.restore();

  if (occupancy) {
    context.font = "bold 24px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "white";
    context.fillText(occupancy, 60, 40, 32);
  }
  return canvas;
}

export async function loadAerialways(viewer, panel) {
  panel.innerHTML = `
    <label><input type="checkbox" data-layer="aerialways" checked> Seilbahnen und Lifte</label>
    <details class="layer-filters">
      <summary id="aerialway-type-heading">Liftarten</summary>
      <div class="layer-filter-options" role="group" aria-labelledby="aerialway-type-heading"></div>
    </details>
    <output role="status">Liftlinien werden geladen …</output>
  `;
  const layerToggle = panel.querySelector('[data-layer="aerialways"]');
  const options = panel.querySelector(".layer-filter-options");
  const status = panel.querySelector("output");

  try {
    const aerialways = await Cesium.GeoJsonDataSource.load(
      `${import.meta.env.BASE_URL}data/aerialway.geojson`,
      { clampToGround: true },
    );
    aerialways.name = "Seilbahnen und Lifte";

    const time = viewer.clock.currentTime;
    const types = new Set();
    const lineTypes = new Map();
    for (const entity of aerialways.entities.values) {
      if (!entity.polyline) {
        entity.show = false;
        continue;
      }
      const value = entity.properties?.aerialway?.getValue(time);
      const type = aerialwayStyles.has(value) ? value : "other";
      const { label, color } = aerialwayStyles.get(type);
      types.add(type);
      lineTypes.set(entity, type);
      entity.name = entity.properties?.name?.getValue(time) || label;
      entity.polyline.width = 6;
      entity.polyline.material = Cesium.Color.fromCssColorString(color);
      entity.polyline.classificationType = Cesium.ClassificationType.TERRAIN;
      entity.polyline.zIndex = 2;
      const occupancy = String(
        entity.properties?.["aerialway:occupancy"]?.getValue(time) ?? "",
      ).trim();
      entity.position = getLineMidpoint(entity.polyline.positions.getValue(time));
      entity.billboard = new Cesium.BillboardGraphics({
        image: makeAerialwayBadge(type, color, occupancy),
        scale: 0.5,
        heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN,
      });
    }

    options.innerHTML = Array.from(aerialwayStyles)
      .filter(([type]) => types.has(type))
      .map(
        ([type, { label, color }]) => `
          <label>
            <input type="checkbox" data-aerialway-type="${type}" checked>
            <span class="aerialway-line" style="background-color: ${color}" aria-hidden="true"></span>
            ${label}
          </label>
        `,
      )
      .join("");

    const update = () => {
      aerialways.show = layerToggle.checked;
      const selectedTypes = new Set(
        Array.from(
          options.querySelectorAll("[data-aerialway-type]:checked"),
          (input) => input.dataset.aerialwayType,
        ),
      );
      for (const [entity, type] of lineTypes) {
        entity.show = selectedTypes.has(type);
      }
      viewer.scene.requestRender();
    };
    await viewer.dataSources.add(aerialways);
    panel.addEventListener("change", update);
    update();
    status.textContent = `Geladen: ${lineTypes.size} Liftlinien.`;
  } catch (error) {
    status.textContent = "Liftlinien konnten nicht geladen werden. Bitte neu laden.";
    console.error("Failed to load aerialway GeoJSON:", error);
  }
}
