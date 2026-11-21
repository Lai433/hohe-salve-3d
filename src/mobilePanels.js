export const mobileMapLayout = window.matchMedia(
  "(max-width: 760px), (max-height: 520px) and (pointer: coarse)",
);

export function setupMobilePanels(map, dock, interactions, closeObjectInfo) {
  const buttons = Array.from(dock.querySelectorAll("button"));
  const openPanel = (panelId) => {
    for (const button of buttons) {
      const id = button.getAttribute("aria-controls");
      const open = id === panelId;
      button.setAttribute("aria-expanded", String(open));
      document.getElementById(id).classList.toggle("mobile-panel-open", open);
    }
  };
  const closePanels = () => openPanel();

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const panelId = button.getAttribute("aria-controls");
      closeObjectInfo();
      openPanel(
        button.getAttribute("aria-expanded") === "true" ? undefined : panelId,
      );
    });
  }
  map.addEventListener("pointerdown", () => {
    if (mobileMapLayout.matches) {
      closePanels();
    }
  });
  interactions.addEventListener("click", (event) => {
    if (
      mobileMapLayout.matches &&
      event.target.closest(
        '[data-camera-view], #object-info-toggle[aria-pressed="true"]',
      )
    ) {
      closePanels();
    }
  });
  mobileMapLayout.addEventListener("change", closePanels);
}
