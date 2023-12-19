import * as itowns from "itowns";
import * as THREE from "three";

const boundingVolumeBox = new THREE.Box3();
const boundingVolumeSphere = new THREE.Sphere();

// This method is a copy of the `computeNodeSSE` by iTowns
// but is using either camera position or mouse position
// https://github.com/iTowns/itowns/blob/7a9457075067afa1a7aa2dc3cb72999033105ff6/src/Process/3dTilesProcessing.js#L257
const computeNodeSSE = (camera, node) => {
  node.distance = 0;
  if (node.boundingVolume.region) {
    boundingVolumeBox.copy(node.boundingVolume.region.box3D);
    boundingVolumeBox.applyMatrix4(node.boundingVolume.region.matrixWorld);
    node.distance = boundingVolumeBox.distanceToPoint(camera.camera3D.position);
  } else if (node.boundingVolume.box) {
    // boundingVolume.box is affected by matrixWorld
    boundingVolumeBox.copy(node.boundingVolume.box);
    boundingVolumeBox.applyMatrix4(node.matrixWorld);
    node.distance = boundingVolumeBox.distanceToPoint(camera.camera3D.position);
  } else if (node.boundingVolume.sphere) {
    // boundingVolume.sphere is affected by matrixWorld
    boundingVolumeSphere.copy(node.boundingVolume.sphere);
    boundingVolumeSphere.applyMatrix4(node.matrixWorld);
    // TODO: see https://github.com/iTowns/itowns/issues/800
    node.distance = Math.max(
      0.0,
      boundingVolumeSphere.distanceToPoint(camera.camera3D.position)
    );
  } else {
    return Infinity;
  }
  if (node.distance === 0) {
    // This test is needed in case geometricError = distance = 0
    return Infinity;
  }
  return camera._preSSE * (node.geometricError / node.distance);
};

// This method is a copy of the `$3dTilesSubdivisionControl` by iTowns
// but does not subdivided if it is not on a given extent
// https://github.com/iTowns/itowns/blob/7a9457075067afa1a7aa2dc3cb72999033105ff6/src/Process/3dTilesProcessing.js#L374
const subdivision = (context, layer, node) => {
  node.additiveRefinement = false;
  if (node.boundingVolume.box) {
    boundingVolumeBox.copy(node.boundingVolume.box);
    boundingVolumeBox.applyMatrix4(layer.root.matrixWorld);
    if (layer.clipExtent) {
      if (!boundingVolumeBox.intersectsBox(layer.clipExtent)) {
        node.additiveRefinement = true;

        node.visible = false;
        return false;
      }
    }
  }
  if (layer.tileset.tiles[node.tileId].children === undefined) return false;
  if (layer.tileset.tiles[node.tileId].isTileset) return true;
  const sse = computeNodeSSE(context.camera, node);
  return sse > layer.sseThreshold;
};

const culling = (layer, camera, node, tileMatrixWorld) => {
  if (node.boundingVolume.box) {
    boundingVolumeBox.copy(node.boundingVolume.box);
    boundingVolumeBox.applyMatrix4(tileMatrixWorld);
    if (layer.clipExtent) {
      if (!boundingVolumeBox.intersectsBox(layer.clipExtent)) {
        return true;
      }
    }
  }
  return false;
};

const refinement = () => {
  return itowns.process3dTilesNode(culling, subdivision);
};

export function refinementFiltered(layer) {
  layer.update = refinement();
}
