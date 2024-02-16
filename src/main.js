import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

const { VITE_CESIUM_ION_TOKEN } = import.meta.env;
if (VITE_CESIUM_ION_TOKEN) {
  Cesium.Ion.defaultAccessToken = VITE_CESIUM_ION_TOKEN;
}

const summit = {
  longitude: 12.203309,
  latitude: 47.465002,
  cameraTargetHeight: 1830,
};

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain({
    requestVertexNormals: true,
  }),
  animation: false,
  timeline: false,
});

viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(summit.longitude, summit.latitude),
  label: {
    text: "Hohe Salve",
    font: "bold 24px sans-serif",
    fillColor: Cesium.Color.WHITE,
    outlineColor: Cesium.Color.BLACK,
    outlineWidth: 3,
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -12),
  },
});

viewer.camera.lookAt(
  Cesium.Cartesian3.fromDegrees(
    summit.longitude,
    summit.latitude,
    summit.cameraTargetHeight,
  ),
  new Cesium.HeadingPitchRange(
    Cesium.Math.toRadians(25),
    Cesium.Math.toRadians(-30),
    3000,
  ),
);
viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

const snowline = 1350;
const fullSnowHeight = 1650;

const ramp = document.createElement("canvas");
ramp.width = 256;
ramp.height = 1;

const context = ramp.getContext("2d");
const gradient = context.createLinearGradient(0, 0, ramp.width, 0);
gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
gradient.addColorStop(1, "rgba(255, 255, 255, 0.8)");
context.fillStyle = gradient;
context.fillRect(0, 0, ramp.width, ramp.height);

const snowMaterial = Cesium.Material.fromType("ElevationRamp", {
  minimumHeight: snowline,
  maximumHeight: fullSnowHeight,
  image: ramp,
});

const snowCheckbox = document.createElement("input");
snowCheckbox.type = "checkbox";

const snowControl = document.createElement("label");
snowControl.style.cssText = `
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  background: #20242c;
  color: white;
  font: 14px sans-serif;
  cursor: pointer;
`;
snowControl.append(snowCheckbox, "Simulated snow");
document.body.append(snowControl);

snowCheckbox.addEventListener("change", () => {
  viewer.scene.globe.material = snowCheckbox.checked
    ? snowMaterial
    : undefined;
  viewer.scene.requestRender();
});