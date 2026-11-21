import * as Cesium from "cesium";

const buildingHeight = 10;
const markerHeight = buildingHeight + 3;

function footprintCenter(vertices) {
  const origin = vertices[0];
  let area = 0;
  let longitude = 0;
  let latitude = 0;
  for (const [index, current] of vertices.entries()) {
    const next = vertices[(index + 1) % vertices.length];
    const x = current.longitude - origin.longitude;
    const y = current.latitude - origin.latitude;
    const nextX = next.longitude - origin.longitude;
    const nextY = next.latitude - origin.latitude;
    const cross = x * nextY - nextX * y;
    area += cross;
    longitude += (x + nextX) * cross;
    latitude += (y + nextY) * cross;
  }
  return area === 0
    ? new Cesium.Cartographic(origin.longitude, origin.latitude)
    : new Cesium.Cartographic(
        origin.longitude + longitude / (3 * area),
        origin.latitude + latitude / (3 * area),
      );
}

function updateElevationLabel(footprint, center, height) {
  const { entity, labelName } = footprint;
  const hasHeight = Number.isFinite(height);
  entity.position = Cesium.Cartesian3.fromRadians(
    center.longitude,
    center.latitude,
    (hasHeight ? height : 0) + markerHeight,
  );
  entity.label.heightReference = hasHeight
    ? Cesium.HeightReference.NONE
    : Cesium.HeightReference.RELATIVE_TO_TERRAIN;
  entity.label.text = hasHeight ? `${labelName} · ${Math.round(height)} m` : labelName;
}

function prepareRing(hierarchy, entity, entities, samples) {
  const vertices = hierarchy.positions;
  const firstSample = samples.length;
  const size = Cesium.Cartesian3.equals(vertices[0], vertices.at(-1))
    ? vertices.length - 1
    : vertices.length;
  for (let index = 0; index < size; index++) {
    samples.push(Cesium.Cartographic.fromCartesian(vertices[index]));
  }
  const holes = hierarchy.holes.map((hole) =>
    prepareRing(
      hole,
      entities.add({
        parent: entity,
        name: entity.name,
        description: entity.description,
      }),
      entities,
      samples,
    ),
  );
  return { entity, hierarchy, firstSample, size, holes };
}

function createRoof(ring, samples, wallColor) {
  const ground = samples.slice(ring.firstSample, ring.firstSample + ring.size);
  if (ground.some(({ height }) => !Number.isFinite(height))) {
    throw new Error("Missing terrain sample for building");
  }
  const roof = ground.map(({ longitude, latitude, height }) =>
    Cesium.Cartesian3.fromRadians(longitude, latitude, height + buildingHeight),
  );
  const bottom = ground.map(({ height }) => height);
  ring.entity.wall = new Cesium.WallGraphics({
    show: ring.entity.isShowing,
    positions: [...roof, roof[0]],
    minimumHeights: [...bottom, bottom[0]],
    material: wallColor,
  });
  return new Cesium.PolygonHierarchy(
    roof,
    ring.holes.map((hole) => createRoof(hole, samples, wallColor)),
  );
}

export function styleBuildings(
  viewer,
  buildings,
  { roofColor, wallColor, showElevationLabel = false, billboard },
) {
  const time = viewer.clock.currentTime;
  const { entities } = buildings;
  const samples = [];
  const footprints = entities.values.slice().map((entity) => {
    const name = entity.properties?.name_2?.getValue(time);
    entity.name = name || entity.name || buildings.name;
    entity.polygon.material = roofColor;
    entity.polygon.outline = false;
    entity.polygon.classificationType = Cesium.ClassificationType.TERRAIN;
    const hierarchy = entity.polygon.hierarchy.getValue(time);
    const footprint = prepareRing(hierarchy, entity, entities, samples);
    const labelName = showElevationLabel ? name?.trim() : undefined;
    if (!labelName && !billboard) {
      return footprint;
    }

    const { firstSample, size } = footprint;
    const center = footprintCenter(samples.slice(firstSample, firstSample + size));
    if (billboard) {
      entity.position = Cesium.Cartesian3.fromRadians(center.longitude, center.latitude, markerHeight);
      entity.billboard = billboard;
    }
    if (labelName) {
      footprint.labelName = labelName;
      footprint.centerSample = samples.push(center) - 1;
      entity.label = new Cesium.LabelGraphics({
        font: "bold 15px sans-serif",
        fillColor: Cesium.Color.BLACK,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      });
      updateElevationLabel(footprint, center);
    }
    return footprint;
  });

  let heightRequest = 0;
  const updateHeights = async (provider) => {
    const request = ++heightRequest;
    const heights = samples.map((sample) => Cesium.Cartographic.clone(sample));
    const hasTerrain = provider && !(provider instanceof Cesium.EllipsoidTerrainProvider);
    try {
      if (provider?.availability) {
        await Cesium.sampleTerrainMostDetailed(provider, heights, true);
      } else if (hasTerrain) {
        await Cesium.sampleTerrain(provider, 14, heights, true);
      }
      if (request !== heightRequest) {
        return;
      }
      for (const footprint of footprints) {
        const { polygon } = footprint.entity;
        polygon.hierarchy = createRoof(footprint, heights, wallColor);
        polygon.perPositionHeight = true;
        if (footprint.centerSample !== undefined) {
          const center = heights[footprint.centerSample];
          updateElevationLabel(footprint, center, hasTerrain ? center.height : undefined);
        }
      }
      viewer.scene.requestRender();
    } catch (error) {
      if (request === heightRequest) {
        for (const footprint of footprints) {
          const { entity, hierarchy, centerSample } = footprint;
          entity.polygon.hierarchy = hierarchy;
          entity.polygon.perPositionHeight = false;
          if (centerSample !== undefined) {
            updateElevationLabel(footprint, samples[centerSample]);
          }
        }
        for (const entity of entities.values) {
          entity.wall = undefined;
        }
        viewer.scene.requestRender();
        console.warn(`Failed to sample terrain for ${buildings.name}:`, error);
      }
    }
  };

  viewer.scene.terrainProviderChanged.addEventListener(updateHeights);
  updateHeights(viewer.scene.terrainProvider);
}
