import * as Cesium from "cesium";

const gradient = new Cesium.Material({
  fabric: {
    type: "AerialwayGradient",
    uniforms: {
      startColor: Cesium.Color.DARKGREEN,
      endColor: Cesium.Color.LIMEGREEN,
    },
    components: {
      diffuse:
        "mix(startColor.rgb, endColor.rgb, clamp(materialInput.st.s, 0.0, 1.0))",
    },
  },
});
gradient.translucent = false;

function liftStyle(label, start, end) {
  const startColor = Cesium.Color.fromCssColorString(start);
  const endColor = Cesium.Color.fromCssColorString(end);
  return {
    label,
    start,
    end,
    startColor,
    endColor,
    material: {
      isConstant: true,
      definitionChanged: new Cesium.Event(),
      getType: () => gradient.type,
      getValue(_time, result = {}) {
        result.startColor = startColor;
        result.endColor = endColor;
        return result;
      },
      equals(other) {
        return this === other;
      },
    },
  };
}

const aerialwayStyles = new Map([
  ["gondola", liftStyle("Gondelbahn", "#064e3b", "#10b981")],
  ["chair_lift", liftStyle("Sessellift", "#166534", "#4ade80")],
  ["platter", liftStyle("Tellerlift", "#3f6212", "#a3cf36")],
  ["magic_carpet", liftStyle("Zauberteppich", "#047857", "#6ee7b7")],
  ["other", liftStyle("Sonstige / ohne Angabe", "#365848", "#90b99a")],
]);

const endpointOutline = Cesium.Color.fromCssColorString("#052e16");

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
    for (const entity of [...aerialways.entities.values]) {
      if (!entity.polyline) {
        entity.show = false;
        continue;
      }
      const value = entity.properties?.aerialway?.getValue(time);
      const type = aerialwayStyles.has(value) ? value : "other";
      const { label, material, startColor, endColor } = aerialwayStyles.get(type);
      types.add(type);
      lineTypes.set(entity, type);
      entity.name = entity.properties?.name?.getValue(time) || label;
      entity.polyline.width = 6;
      entity.polyline.material = material;
      entity.polyline.classificationType = Cesium.ClassificationType.TERRAIN;
      entity.polyline.zIndex = 2;

      const positions = entity.polyline.positions.getValue(time);
      for (const [position, color] of [
        [positions[0], startColor],
        [positions.at(-1), endColor],
      ]) {
        aerialways.entities.add({
          parent: entity,
          name: entity.name,
          description: entity.description,
          position,
          point: {
            color,
            pixelSize: 11,
            outlineColor: endpointOutline,
            outlineWidth: 2,
            heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN,
          },
        });
      }
    }

    options.innerHTML = Array.from(aerialwayStyles)
      .filter(([type]) => types.has(type))
      .map(
        ([type, { label, start, end }]) => `
          <label>
            <input type="checkbox" data-aerialway-type="${type}" checked>
            <span class="aerialway-line" style="background: linear-gradient(to right, ${start}, ${end})" aria-hidden="true"></span>
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
