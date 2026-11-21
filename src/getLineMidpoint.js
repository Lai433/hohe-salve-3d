import * as Cesium from "cesium";

export function getLineMidpoint(positions) {
  const lengths = positions.slice(1).map((position, index) =>
    Cesium.Cartesian3.distance(positions[index], position),
  );
  let remaining = lengths.reduce((total, length) => total + length, 0) / 2;
  for (const [index, length] of lengths.entries()) {
    if (length > 0 && remaining <= length) {
      return Cesium.Cartesian3.lerp(
        positions[index],
        positions[index + 1],
        remaining / length,
        new Cesium.Cartesian3(),
      );
    }
    remaining -= length;
  }
  return positions[0];
}
