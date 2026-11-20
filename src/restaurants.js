import * as Cesium from "cesium";
import { styleBuildings } from "./buildings.js";

const roofColor = Cesium.Color.fromCssColorString("#facc15");
const wallColor = Cesium.Color.fromCssColorString("#d4a508");

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
    styleBuildings(viewer, restaurants, { roofColor, wallColor });
    restaurants.show = toggle.checked;
    await viewer.dataSources.add(restaurants);

    const update = () => {
      restaurants.show = toggle.checked;
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
