import * as Cesium from "cesium";

const buildingHeight = 10;

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
  const roof = ground.map(({ longitude, latitude, height }) =>
    Cesium.Cartesian3.fromRadians(longitude, latitude, height + buildingHeight),
  );
  const bottom = ground.map(({ height }) => height);
  ring.entity.wall = new Cesium.WallGraphics({
    positions: [...roof, roof[0]],
    minimumHeights: [...bottom, bottom[0]],
    material: wallColor,
  });
  return new Cesium.PolygonHierarchy(
    roof,
    ring.holes.map((hole) => createRoof(hole, samples, wallColor)),
  );
}

export function styleBuildings(viewer, buildings, { roofColor, wallColor }) {
  const time = viewer.clock.currentTime;
  const { entities } = buildings;
  const samples = [];
  const footprints = entities.values.slice().map((entity) => {
    entity.name =
      entity.properties?.name_2?.getValue(time) || entity.name || buildings.name;
    entity.polygon.material = roofColor;
    entity.polygon.outline = false;
    entity.polygon.classificationType = Cesium.ClassificationType.TERRAIN;
    const hierarchy = entity.polygon.hierarchy.getValue(time);
    return prepareRing(hierarchy, entity, entities, samples);
  });

  let heightRequest = 0;
  const updateHeights = async (provider) => {
    const request = ++heightRequest;
    const heights = samples.map((sample) => Cesium.Cartographic.clone(sample));
    try {
      if (provider?.availability) {
        await Cesium.sampleTerrainMostDetailed(provider, heights, true);
      } else if (provider && !(provider instanceof Cesium.EllipsoidTerrainProvider)) {
        await Cesium.sampleTerrain(provider, 14, heights, true);
      }
      if (request !== heightRequest) {
        return;
      }
      if (heights.some(({ height }) => !Number.isFinite(height))) {
        throw new Error("Missing terrain sample for building");
      }

      for (const footprint of footprints) {
        const { polygon } = footprint.entity;
        polygon.hierarchy = createRoof(footprint, heights, wallColor);
        polygon.perPositionHeight = true;
      }
      viewer.scene.requestRender();
    } catch (error) {
      if (request === heightRequest) {
        for (const { entity, hierarchy } of footprints) {
          entity.polygon.hierarchy = hierarchy;
          entity.polygon.perPositionHeight = false;
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
