import { GeoVolume } from "../Model/GeoVolume";
import { loadTextFile } from "@ud-viz/utils_browser";
import { Graph } from "@ud-viz/widget_sparql";

import * as jquery from "jquery";
/**
 * const GeoVolumeSource = new GeoVolumeSource({
 *     url: 'http://dummy.fr/',
 *     crs: 'crs:4326',
 *     extent: {
 *         west: 4.568,
 *         east: 5.18,
 *         south: 45.437,
 *         north: 46.03,
 *     },
 *     format: 'application/json'
 * });
 */

const itowns = require("itowns");

export class GeoVolumeSource {
  /**
   * @param {Object} source - An object that can contain the url of a GeoVolume API.
   * @param {Object} itownsView
   *
   * @constructor
   */
  constructor(sparqlProvider, itownsView) {
    this.sparqlProvider = sparqlProvider;

    this.itownsView = itownsView;

    this.graph = new Graph();
    /**
     * Array of GeoVolume
     */
    this.collection = new Array();
    this.getgeoVolumes();
  }

  get Collections() {
    return this.collection;
  }

  getgeoVolumeWith3DTilesFromCollection() {
    let geoVolumes = new Array();
    for (let geoVolume of this.collection) {
      geoVolumes.push(geoVolume.getGeoVolumesWith3DTiles());
    }
    return geoVolumes;
  }

  getVisibleExtent() {
    let camera = this.itownsView.camera.camera3D;
    var raycaster = new THREE.Raycaster();
    var plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    //Compute ray from the bottom left corner of the camera to the ground
    raycaster.setFromCamera(new THREE.Vector2(-1, -1), camera);
    var min = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, min);

    //Compute ray from the top right corner of the camera to the ground
    raycaster.setFromCamera(new THREE.Vector2(1, 1), camera);
    var max = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, max);
    max.setZ(camera.position.z);
    return [min, max];
  }

  getgeoVolumesFromExtent() {
    let extent = this.getVisibleExtent();
    let crs = this.itownsView.referenceCrs;
    return this.getgeoVolumes(crs, extent);
  }

  getgeoVolumeInCollectionById(id) {
    for (let geoVolume of this.collection) {
      if (geoVolume.containGeovolumeById(id))
        return geoVolume.getGeovolumeById(id);
    }
    return false;
  }

  getGeoVolumesBboxGeom() {
    let geoVolumesBbox = new Array();
    for (let geoVolume of this.collection) {
      geoVolumesBbox = geoVolumesBbox.concat(geoVolume.getBboxGeom());
    }
    return geoVolumesBbox;
  }

  getVisibleGeoVolumesBboxGeom() {
    let geoVolumesBbox = new Array();
    for (let geoVolume of this.collection) {
      geoVolumesBbox = geoVolumesBbox.concat(geoVolume.getVisibleBboxGeom());
    }
    return geoVolumesBbox;
  }

  getgeoVolumes() {
    loadTextFile("./assets/queries/get_collections.rq").then((result) => {
      this.sparqlProvider.querySparqlEndpointService(result).then((res) => {
        for (const triple of res.results.bindings) {
          this.collection.push(new GeoVolume(this.sparqlProvider,triple.object.value,this.itownsView.referenceCrs));
        }

        setTimeout(() => {this.collection[0].displayBbox(this.itownsView.scene);},1000); 
      });
    });
  }
}
