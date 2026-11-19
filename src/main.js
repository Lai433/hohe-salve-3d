import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./style.css";
import { loadPistes } from "./pistes.js";

const { VITE_CESIUM_ION_TOKEN } = import.meta.env;
if (VITE_CESIUM_ION_TOKEN) {
  Cesium.Ion.defaultAccessToken = VITE_CESIUM_ION_TOKEN;
}

const summit = {
  longitude: 12.203309,
  latitude: 47.465002,
  cameraTargetHeight: 2000,
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
    font: "bold 20px sans-serif",
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
    3200,
  ),
);
viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);

loadPistes(viewer);

const snowline = 200;
const fullSnowHeight = 1200;

// World-anchored noise stays fixed across terrain tiles and camera moves.
const snowFrame = Cesium.Transforms.eastNorthUpToFixedFrame(
  Cesium.Cartesian3.fromDegrees(summit.longitude, summit.latitude),
);
const snowMaterial = new Cesium.Material({
  fabric: {
    type: "TerrainSnow",
    uniforms: {
      minimumHeight: snowline,
      maximumHeight: fullSnowHeight,
      slopeStart: Cesium.Math.toRadians(25),
      slopeEnd: Cesium.Math.toRadians(55),
      noiseAmplitude: 45, // Maximum snowline variation in meters.
      noiseScale: 180, // Size of the larger patches in meters.
      snowOrigin: Cesium.Matrix4.getTranslation(snowFrame, new Cesium.Cartesian3()),
      snowEast: Cesium.Matrix4.getColumn(snowFrame, 0, new Cesium.Cartesian4()),
      snowNorth: Cesium.Matrix4.getColumn(snowFrame, 1, new Cesium.Cartesian4()),
    },
    source: `
      float snowHash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float snowNoise(vec2 p) {
        vec2 cell = floor(p);
        vec2 f = fract(p);
        vec2 blend = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(snowHash(cell), snowHash(cell + vec2(1.0, 0.0)), blend.x),
          mix(snowHash(cell + vec2(0.0, 1.0)), snowHash(cell + vec2(1.0)), blend.x),
          blend.y
        );
      }

      czm_material czm_getMaterial(czm_materialInput materialInput) {
        czm_material material = czm_getDefaultMaterial(materialInput);
        vec3 worldPosition = (czm_inverseView * vec4(-materialInput.positionToEyeEC, 1.0)).xyz;
        vec3 localPosition = worldPosition - snowOrigin;
        vec2 p = vec2(dot(localPosition, snowEast.xyz), dot(localPosition, snowNorth.xyz)) / noiseScale;
        float noise = 0.7 * snowNoise(p) + 0.3 * snowNoise(p * 3.1 + vec2(17.0, 29.0));
        float heightOffset = (noise * 2.0 - 1.0) * noiseAmplitude;
        float elevationCoverage = smoothstep(minimumHeight, maximumHeight, materialInput.height + heightOffset);
        float slopeCoverage = mix(1.0, 0.08, smoothstep(slopeStart, slopeEnd, materialInput.slope));

        material.diffuse = vec3(1.0);
        material.alpha = 0.8 * elevationCoverage * slopeCoverage;
        return material;
      }
    `,
  },
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
snowControl.append(snowCheckbox, "Simulierter Schnee");
document.body.append(snowControl);

snowCheckbox.addEventListener("change", () => {
  viewer.scene.globe.material = snowCheckbox.checked
    ? snowMaterial
    : undefined;
  viewer.scene.requestRender();
});
