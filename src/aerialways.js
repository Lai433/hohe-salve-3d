import * as Cesium from "cesium";

const aerialwayStyles = new Map([
  ["gondola", { label: "Gondelbahn", color: "#7e22ce" }],
  ["chair_lift", { label: "Sessellift", color: "#0f766e" }],
  ["platter", { label: "Tellerlift", color: "#b45309" }],
  ["magic_carpet", { label: "Zauberteppich", color: "#be185d" }],
  ["other", { label: "Sonstige / ohne Angabe", color: "#475569" }],
]);

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
      entity.polyline.width = 4;
      entity.polyline.material = new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.fromCssColorString(color),
      });
      entity.polyline.classificationType = Cesium.ClassificationType.TERRAIN;
      entity.polyline.zIndex = 2;
    }

    options.innerHTML = Array.from(aerialwayStyles)
      .filter(([type]) => types.has(type))
      .map(
        ([type, { label, color }]) => `
          <label>
            <input type="checkbox" data-aerialway-type="${type}" checked>
            <span class="aerialway-line" style="color: ${color}" aria-hidden="true"></span>
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
