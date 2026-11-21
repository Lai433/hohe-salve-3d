export function setPolygonLayerVisibility(layer, show) {
  layer.show = show;
  for (const entity of layer.entities.values) {
    if (entity.polygon) {
      entity.polygon.show = show;
    }
    if (entity.wall) {
      entity.wall.show = show;
    }
  }
}
