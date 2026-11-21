import * as Cesium from "cesium";
import { styleBuildings } from "./buildings.js";
import { setPolygonLayerVisibility } from "./setPolygonLayerVisibility.js";

const roofColor = Cesium.Color.fromCssColorString("#facc15");
const wallColor = Cesium.Color.fromCssColorString("#d4a508");

function makeRestaurantBadge() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  context.fillStyle = roofColor.toCssColorString();
  context.fillRect(0, 0, canvas.width, canvas.height);

  const fork = new Path2D("M15 14v12a8 8 0 0 0 16 0V14 M23 14v36");
  const knife = new Path2D("M46 50V14c-6 4-10 13-10 23h10");
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const [color, width] of [["#806400", 7], ["white", 4]]) {
    context.strokeStyle = color;
    context.lineWidth = width;
    context.stroke(fork);
    context.stroke(knife);
  }
  return canvas;
}

export async function loadRestaurants(viewer, objectControls) {
  const panel = document.createElement("div");
  panel.className = "layer-controls";
  panel.innerHTML = `
    <label>
      <input type="checkbox" data-layer="restaurants" checked>
      <span class="piste-color" style="--piste-color: ${roofColor.toCssColorString()}" aria-hidden="true"></span>
      Restaurants
    </label>
    <output role="status">Restaurants werden geladen …</output>
  `;
  objectControls.append(panel);

  const toggle = panel.querySelector('[data-layer="restaurants"]');
  const status = panel.querySelector("output");
  try {
    const restaurants = await Cesium.GeoJsonDataSource.load(
      `${import.meta.env.BASE_URL}data/restaurant.geojson`,
      {
        clampToGround: true,
        credit: new Cesium.Credit(
          '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>',
          true,
        ),
      },
    );
    restaurants.name = "Restaurants";
    const count = restaurants.entities.values.length;
    styleBuildings(viewer, restaurants, {
      roofColor,
      wallColor,
      billboard: {
        image: makeRestaurantBadge(),
        scale: 0.5,
        heightReference: Cesium.HeightReference.RELATIVE_TO_TERRAIN,
        pixelOffset: new Cesium.Cartesian2(24, -8),
      },
    });
    setPolygonLayerVisibility(restaurants, toggle.checked);
    await viewer.dataSources.add(restaurants);

    const update = () => {
      setPolygonLayerVisibility(restaurants, toggle.checked);
      viewer.scene.requestRender();
    };
    toggle.addEventListener("change", update);
    update();
    status.textContent = `Geladen: ${count} Restaurants.`;
  } catch (error) {
    status.textContent = "Restaurants konnten nicht geladen werden. Bitte neu laden.";
    console.error("Failed to load restaurant GeoJSON:", error);
  }
}
