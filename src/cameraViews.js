import * as Cesium from "cesium";

export function setupCameraViews(viewer, target, controls) {
  const { camera, scene } = viewer;
  const showView = (heading, pitch) => {
    viewer.trackedEntity = undefined;
    camera.cancelFlight();
    if (scene.mode !== Cesium.SceneMode.SCENE3D) {
      scene.morphTo3D(0);
    }
    camera.lookAt(
      target,
      new Cesium.HeadingPitchRange(Cesium.Math.toRadians(heading), Cesium.Math.toRadians(pitch), 3200),
    );
    camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    scene.requestRender();
  };

  const showDefaultView = () => showView(25, -30);
  controls
    .querySelector('[data-camera-view="default"]')
    .addEventListener("click", showDefaultView);
  controls
    .querySelector('[data-camera-view="top"]')
    .addEventListener("click", () => showView(0, -90));
  showDefaultView();
}
