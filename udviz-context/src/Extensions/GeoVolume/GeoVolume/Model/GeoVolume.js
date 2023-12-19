import { loadTextFile } from "@ud-viz/utils_browser";
import { boxIntersect } from "box-intersect";
const proj4 = require("proj4");
const THREE = require("three");

export class GeoVolume {
  constructor(sparqlprovider, uri, crs = "EPSG:4326", parent = null) {
    this.uri = uri;
    this.sparqlProvider = sparqlprovider;
    this.crs = crs;
    this.centroid;
    this.links = [];
    this.title;
    this.extent;
    this.children = [];
    this.content = [];
    this.bboxGeom = null;
    this.parent = parent;
    return new Promise((resolve) => {
      let promises = [];
      promises.push(this.getLinksFromURI());
      promises.push(this.getTitleFromURI());
      promises.push(this.getExtentFromURI());
      promises.push(this.getContentsFromURI());
      promises.push(this.getChildrenFromURI());
      Promise.all(promises).then(() => {
        resolve(this);
      });
    });
  }
  getChildrenFromURI() {
    return new Promise((resolve) => {
      loadTextFile("./assets/queries/get_children_by_uri.rq").then((result) => {
        result = result.replace("$URI", this.uri);
        this.sparqlProvider.querySparqlEndpointService(result).then((res) => {
          let promises = [];
          for (let b of res.results.bindings) {
            promises.push(new GeoVolume(this.sparqlProvider, b.object.value, this.crs, this));
          }
          Promise.all(promises).then((children) => {
            for (let child of children) {
              this.children.push(child);
            }
            resolve();
          });
        });
      });
    });
  }

  getExtentFromURI() {
    return new Promise((resolve) => {
      loadTextFile("./assets/queries/get_extent_by_uri.rq").then((result) => {
        result = result.replace("$URI", this.uri);
        this.sparqlProvider.querySparqlEndpointService(result).then((res) => {
          this.extent = {
            bbox: JSON.parse(res.results.bindings[0].bbox.value),
            crs: res.results.bindings[0].crs.value,
          };
          this.centroid = this.getCentroid(this.crs);
          this.createBbox();
          resolve();
        });
      });
    });
  }

  getLinksFromURI() {
    return new Promise((resolve) => {
      loadTextFile("./assets/queries/get_links_by_uri.rq").then((result) => {
        result = result.replace("$URI", this.uri);
        this.sparqlProvider.querySparqlEndpointService(result).then((res) => {
          for (const triple of res.results.bindings) {
            this.links.push({
              rel: triple.rel.value,
              href: triple.href.value,
              type: triple.type.value,
              title: triple.title.value,
            });
          }
          resolve();
        });
      });
    });
  }

  getTitleFromURI() {
    return new Promise((resolve) => {
      loadTextFile("./assets/queries/get_title_by_uri.rq").then((result) => {
        result = result.replace("$URI", this.uri);
        this.sparqlProvider.querySparqlEndpointService(result).then((res) => {
          this.title = res.results.bindings[0].object.value;
          this.id = res.results.bindings[0].object.value;
          resolve();
        });
      });
    });
  }

  getContentsFromURI() {
    return new Promise((resolve) => {
      loadTextFile("./assets/queries/get_contents_by_uri.rq").then((result) => {
        result = result.replace("$URI", this.uri);
        this.sparqlProvider.querySparqlEndpointService(result).then((res) => {
          for (const triple of res.results.bindings) {
            this.content.push({
              rel: triple.rel.value,
              href: triple.href.value,
              type: triple.type.value,
              title: triple.title.value,
              variantIdentifier: triple.vi.value,
            });
          }
          resolve();
        });
      });
    });
  }

  isExtentInstersectingWithBbox(bbox, crs) {
    let bboxReprojected = this.reprojectBbox(bbox, crs);
    let extentBbox = this.extent.bbox;
    return boxIntersect([bboxReprojected, extentBbox]).length > 0;
  }

  getCentroid(crs = null) {
    let bbox = this.extent.bbox;
    if (crs) {
      bbox = this.reprojectBbox(bbox, crs);
    }
    return [
      (bbox[0] + bbox[3]) / 2,
      (bbox[1] + bbox[4]) / 2,
      (bbox[2] + bbox[5]) / 2,
    ];
  }

  deleteBbox(threeScene) {
    threeScene.remove(this.bboxGeom);
    for (let child of this.children) {
      child.deleteBbox(threeScene);
    }
  }

  createBbox() {
    let bbox = this.extent.bbox;
    bbox = this.reprojectBbox(bbox, this.crs);
    var geom = new THREE.BoxGeometry(
      bbox[3] - bbox[0],
      bbox[1] - bbox[4],
      bbox[2] - bbox[5],
      1,
      1,
      1
    );
    var cube = new THREE.Mesh(geom);
    cube.material = new THREE.MeshPhongMaterial();
    cube.material.transparent = true;
    cube.material.opacity = 0.5;
    cube.position.set(this.centroid[0], this.centroid[1], this.centroid[2]);
    cube.updateMatrixWorld();

    var geo = new THREE.EdgesGeometry(cube.geometry); // or WireframeGeometry
    var mat = new THREE.LineBasicMaterial({ color: 0x000000 });
    var wireframe = new THREE.LineSegments(geo, mat);
    cube.add(wireframe);
    wireframe.updateWorldMatrix(false, false);
    cube.geoVolume = this;
    this.bboxGeom = cube;
    this.bboxGeom.visible = false;
  }

  hideBbox() {
    this.bboxGeom.visible = false;
  }

  showBbox() {
    this.bboxGeom.visible = true;
  }

  displayBbox(threeScene) {
    this.createBbox();
    threeScene.add(this.bboxGeom);
    this.bboxGeom.visible = true;
  }

  changeBboxVisibility() {
    this.bboxGeom.visible = !this.bboxGeom.visible;
  }

  getBboxGeom() {
    let geoVolumesBbox = new Array();
    geoVolumesBbox.push(this.bboxGeom);
    for (let child of this.children) {
      geoVolumesBbox = geoVolumesBbox.concat(child.getBboxGeom());
    }
    return geoVolumesBbox;
  }

  getVisibleBboxGeom() {
    let geoVolumesBbox = new Array();
    if (this.bboxGeom.visible) geoVolumesBbox.push(this.bboxGeom);
    for (let child of this.children) {
      geoVolumesBbox = geoVolumesBbox.concat(child.getVisibleBboxGeom());
    }
    return geoVolumesBbox;
  }
  reprojectBbox(bbox, crs) {
    let destCrs = crs ? crs : "EPSG:4326";
    let sourceCrs = this.extent.crs ? this.extent.crs : "EPSG:4326";
    let minBbox, maxBbox;
    if (bbox.length == 6) {
      minBbox = proj4
        .default(sourceCrs, destCrs)
        .forward([bbox[0], bbox[1], bbox[2]]);
      maxBbox = proj4
        .default(sourceCrs, destCrs)
        .forward([bbox[3], bbox[4], bbox[5]]);
    } else {
      minBbox = proj4.default(sourceCrs, destCrs).forward([bbox[0], bbox[1]]);
      maxBbox = proj4.default(sourceCrs, destCrs).forward([bbox[2], bbox[3]]);
    }
    return minBbox.concat(maxBbox);
  }

  isBboxContainedInExtent(bbox, crs) {
    let bboxReprojected = this.reprojectBbox(bbox, crs);
    let extentBbox = this.extent.bbox;
    return (
      extentBbox[0] <= bboxReprojected[0] &&
      extentBbox[1] <= bboxReprojected[1] &&
      extentBbox[3] >= bboxReprojected[3] &&
      extentBbox[4] >= bboxReprojected[4]
    );
  }

  fillChildren(jsonChildren) {
    let childrenArray = new Array();
    if (jsonChildren) {
      for (let child of jsonChildren) {
        childrenArray.push(new GeoVolume(child, this.crs, this));
      }
    }
    return childrenArray;
  }

  getContent(type = null) {
    if (type) {
      let content = new Array();
      for (let c of this.content) {
        if (c.type.includes(type)) content.push(c);
      }
      return content;
    } else return this.content;
  }

  containGeovolumeById(id) {
    if (this.id == id) return this;
    let geoVolume = null;
    for (let child of this.children) {
      geoVolume = child.containGeovolumeById(id);
    }
    return geoVolume;
  }

  getGeovolumeById(id) {
    if (this.id == id) return this;
    let geoVolume = null;
    for (let child of this.children) {
      geoVolume = child.getGeovolumeById(id);
    }
    return geoVolume;
  }

  getContentByTitle(title) {
    for (let c of this.content) {
      if (c.title == title) return c;
    }
    return false;
  }

  hasChildById(id) {
    if (this.children) {
      for (let child of this.children) {
        if (child.id == id) return true;
      }
    }
    return false;
  }

  getChildById(id) {
    if (this.children) {
      for (let child of this.children) {
        if (child.id == id) return child;
      }
    }
    return false;
  }
}
