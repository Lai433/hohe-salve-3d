import * as Cesium from "cesium";

const attributeLabels = {
  ref: "Kennung",
  "piste:difficulty": "Schwierigkeit",
  aerialway: "Liftart",
  "aerialway:station": "Stationsart",
  "aerialway:occupancy": "Personen pro Fahrzeug",
  "aerialway:capacity": "Personen pro Stunde",
  "aerialway:duration": "Fahrzeit (min)",
  "addr:street": "Straße",
  "addr:city": "Ort",
};

export function setupObjectInfo(viewer, toggle, hint, popup) {
  const { camera, canvas, scene, screenSpaceEventHandler: input } = viewer;
  const title = popup.querySelector("h2");
  const layer = popup.querySelector(".object-info-layer");
  const attributes = popup.querySelector("dl");
  const empty = popup.querySelector(".object-info-empty");
  const { LEFT_CLICK, LEFT_DOUBLE_CLICK } = Cesium.ScreenSpaceEventType;
  const nativeClick = input.getInputAction(LEFT_CLICK);
  const nativeDoubleClick = input.getInputAction(LEFT_DOUBLE_CLICK);
  let enabled = false;
  let unsubscribe;

  const close = () => {
    popup.hidden = true;
    unsubscribe?.();
    unsubscribe = undefined;
  };

  const setEnabled = (active) => {
    enabled = active;
    toggle.setAttribute("aria-pressed", String(active));
    hint.hidden = !active;
    canvas.classList.toggle("object-info-active", active);
    if (active) {
      viewer.selectedEntity = undefined;
      viewer.trackedEntity = undefined;
    }
    close();
  };

  input.setInputAction((event) => {
    if (!enabled) {
      nativeClick?.(event);
      return;
    }

    close();
    const picked = scene.pick(event.position);
    const id = picked?.id ?? picked?.primitive?.id;
    if (!(id instanceof Cesium.Entity)) {
      return;
    }
    // Inner walls belong to the same building as the footprint and its marker.
    let entity = id;
    while (entity.parent) {
      entity = entity.parent;
    }
    const time = viewer.clock.currentTime;
    title.textContent =
      entity.label?.text?.getValue(time) || entity.name || "Objekt";
    layer.textContent =
      entity.entityCollection === viewer.entities
        ? ""
        : (entity.entityCollection?.owner?.name ?? "");
    layer.hidden = !layer.textContent;

    const data = entity.properties?.getValue(time) ?? {};
    attributes.replaceChildren();
    for (const [key, value] of Object.entries(data)) {
      if (
        ["name", "name_2"].includes(key) ||
        !Cesium.defined(value) ||
        String(value).trim() === ""
      ) {
        continue;
      }
      const term = document.createElement("dt");
      const detail = document.createElement("dd");
      term.textContent = Object.hasOwn(attributeLabels, key)
        ? attributeLabels[key]
        : key;
      detail.textContent = String(value);
      attributes.append(term, detail);
    }
    empty.hidden = attributes.childElementCount !== 0;

    popup.hidden = false;
    const rect = canvas.getBoundingClientRect();
    const x = rect.left + event.position.x;
    const y = rect.top + event.position.y;
    const left = Math.max(
      12,
      Math.min(
        x - popup.offsetWidth / 2,
        window.innerWidth - popup.offsetWidth - 12,
      ),
    );
    const above = y - popup.offsetHeight - 12;
    const top = above >= 48 ? above : y + 12;
    popup.style.setProperty("--object-info-left", `${left}px`);
    popup.style.setProperty(
      "--object-info-top",
      `${Math.max(48, Math.min(top, window.innerHeight - popup.offsetHeight - 32))}px`,
    );
    unsubscribe = entity.definitionChanged.addEventListener(
      (_entity, property) => {
        if (property === "isShowing" && !entity.isShowing) {
          close();
        }
      },
    );
  }, LEFT_CLICK);

  input.setInputAction((event) => {
    if (!enabled) {
      nativeDoubleClick?.(event);
    }
  }, LEFT_DOUBLE_CLICK);
  toggle.addEventListener("click", () => setEnabled(!enabled));
  popup.querySelector("button").addEventListener("click", close);
  camera.moveStart.addEventListener(close);
  window.addEventListener("resize", close);
  window.addEventListener("keydown", (event) => {
    if (enabled && event.key === "Escape") {
      setEnabled(false);
    }
  });
  return close;
}
