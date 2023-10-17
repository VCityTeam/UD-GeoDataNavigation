import { findChildByID } from "@ud-viz/utils_browser";

import { refinementFiltered } from "../../Utils/Refinement";

const THREE = require("three");
const itowns = require("itowns");

export class GeoVolumeWindow extends THREE.EventDispatcher {
  constructor(geoVolumeSource, itownsView) {
    super();
    /** @type {HTMLElement} */
    this.rootHtml = document.createElement("div");
    this.rootHtml.innerHTML = this.innerContentHtml;
    this.rootHtml.id = "geovolume";
    this.rootHtml.className = "w3-round-xlarge";
    this.geoVolumeSource = geoVolumeSource;
    this.selectedGeoVolume = null;
    this.itownsView = itownsView;

    this.addEventListener(
      GeoVolumeWindow.SELECTED_GEOVOLUME_UPDATED,
      function (event) {
        this.changeDisplayedGeovolume(event.message);
      }
    );

    this.itownsView.domElement.appendChild(this.html());

    this.mouseClickListener = (event) => {
      this.onMouseClick(event);
    };
    this.itownsView.domElement.addEventListener(
      "mousedown",
      this.mouseClickListener
    );
  }

  focusGeovolume() {
    if (this.selectedGeoVolume) {
      let box3 = new THREE.Box3().setFromObject(
        this.selectedGeoVolume.bboxGeom
      );
      this.itownsView.resize();

      let size = new THREE.Vector3();
      box3.getSize(size);
      const maxDim = Math.max(size.x, size.y);
      const fov = this.itownsView.camera.camera3D.fov * (Math.PI / 180);
      let cameraZ = (maxDim / 2 / Math.tan(fov / 2)) * 1.2;

      let position = new THREE.Vector3(
        this.selectedGeoVolume.centroid[0],
        this.selectedGeoVolume.centroid[1],
        box3.max.z + cameraZ
      );
      let angle = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        0
      );
      this.itownsView.controls.initiateTravel(position, "auto", angle, true);
    }
  }

  changeDisplayedGeovolume(geovolume) {
    if (!this.selectedGeoVolume || geovolume.id != this.selectedGeoVolume.id) {
      this.displayGeoVolumeInHTML(geovolume);
      if (this.selectedGeoVolume) {
        this.selectedGeoVolume.deleteBbox(this.itownsView.scene);
        this.deleteContents(this.selectedGeoVolume);
      }
      this.selectedGeoVolume = geovolume;
      this.selectedGeoVolume.displayBbox(this.itownsView.scene);
      for (let children of this.selectedGeoVolume.children) {
        children.displayBbox(this.itownsView.scene);
        children.hideBbox();
      }
      this.itownsView.notifyChange();
      this.focusGeovolume(this.selectedGeoVolume);
    }
  }

  onMouseClick(event) {
    event.preventDefault();
    let raycaster = new THREE.Raycaster();
    let mouse3D = new THREE.Vector2(
      (event.layerX / this.itownsView.domElement.offsetWidth) * 2.0 - 1,
      -(event.layerY / this.itownsView.domElement.offsetHeight) * 2.0 + 1
    );
    raycaster.setFromCamera(mouse3D, this.itownsView.camera.camera3D);
    let intersects = raycaster.intersectObjects(
      this.geoVolumeSource.getVisibleGeoVolumesBboxGeom()
    );
    if (intersects.length > 0) {
      if (
        !this.selectedGeoVolume ||
        intersects[0].object.geoVolume.id != this.selectedGeoVolume.id
      ) {
        this.dispatchEvent({
          type: GeoVolumeWindow.SELECTED_GEOVOLUME_UPDATED,
          message: intersects[0].object.geoVolume,
        });
        this.focusGeovolume();
      }
    }
  }

  html() {
    this.geoVolumeSource.getgeoVolumes().then(() => {
      this.dispatchEvent({
        type: GeoVolumeWindow.SELECTED_GEOVOLUME_UPDATED,
        message: this.geoVolumeSource.collection[0].children[0].children[0],
      });
      this.itownsView.notifyChange();
    });
    return this.rootHtml;
  }

  get innerContentHtml() {
    return /*html*/ `
      <div class ="box-section" id="${this.geoVolumeDivId}"> 
        <div id= "${this.geoVolumeListId}"></div>
      </div>
    `;
  }

  visualizePointCloudContent(content) {
    if (this.itownsView.getLayerById(content.id) == undefined) {
      const l3dt = new itowns.C3DTilesLayer(
        content.id,
        {
          name: content.id,
          pntsSizeMode: 2,
          source: new itowns.C3DTilesSource({
            url: content["href"],
          }),
        },
        this.itownsView
      );
      l3dt.clipExtent = new THREE.Box3(
        new THREE.Vector3(1845820, 5177430, -100),
        new THREE.Vector3(1845890, 5177499, 500)
      );

      itowns.View.prototype.addLayer.call(this.itownsView, l3dt);

      if (content.variantIdentifier == "extent") {
        refinementFiltered(l3dt);
        l3dt.addEventListener(
          itowns.C3DTILES_LAYER_EVENTS.ON_TILE_CONTENT_LOADED,
          ({ tileContent }) => {
            tileContent.traverse((child) => {
              if (child.geometry && child.geometry.isBufferGeometry) {
                child.material.size = 3;
                let pos_world = child.geometry.attributes.position.clone();
                pos_world.applyMatrix4(child.matrixWorld);
                let new_pos = [];
                let new_color = [];
                for (let i = 0; i < pos_world.count; i++) {
                  let pos = new THREE.Vector3().fromBufferAttribute(
                    pos_world,
                    i
                  );
                  if (l3dt.clipExtent.containsPoint(pos)) {
                    new_pos.push(
                      child.geometry.attributes.position.array[3 * i]
                    );
                    new_pos.push(
                      child.geometry.attributes.position.array[3 * i + 1]
                    );
                    new_pos.push(
                      child.geometry.attributes.position.array[3 * i + 2]
                    );
                    new_color.push(
                      child.geometry.attributes.color.array[3 * i]
                    );
                    new_color.push(
                      child.geometry.attributes.color.array[3 * i + 1]
                    );
                    new_color.push(
                      child.geometry.attributes.color.array[3 * i + 2]
                    );
                  }
                }
                child.geometry.attributes.position = new THREE.BufferAttribute(
                  new Float32Array(new_pos),
                  3,
                  false
                );
                child.geometry.attributes.color = new THREE.BufferAttribute(
                  new Uint8Array(new_color),
                  3,
                  true
                );
              }
            });
          }
        );
      }
    }
  }

  visualize3DTilesContent(content) {
    if (content.url == undefined) content.url = content.href;

    if (this.itownsView.getLayerById(content.id) == undefined) {
      var gml_id = content.variantIdentifier.split("=")[1];
      if (content.variantIdentifier.includes("TileID")) {
        var keys = content.variantIdentifier.split("&");
        var tileId = keys[0].split("=")[1];
        var batchId = keys[1].split("=")[1];
      }
      const extensions = new itowns.C3DTExtensions();
      extensions.registerExtension("3DTILES_batch_table_hierarchy", {
        [itowns.C3DTilesTypes.batchtable]:
          itowns.C3DTBatchTableHierarchyExtension,
      });

      var itownsLayer = new itowns.C3DTilesLayer(
        content["id"],
        {
          name: content["id"],
          source: new itowns.C3DTilesSource({
            url: content["url"],
          }),
          registeredExtensions: extensions,
        },
        this.itownsView
      );

      itowns.View.prototype.addLayer.call(this.itownsView, itownsLayer);

      const myStyle = new itowns.Style({
        fill: {
          color: function () {
            return "grey";
          },
          opacity: function (feature) {
            feature.toHide = true;
            if (
              content.variantIdentifier.includes("GMLID") &&
              feature.getInfo().batchTable.gml_id == gml_id
            ) {
              return 1;
            }
            if (
              content.variantIdentifier.includes("TileID") &&
              feature.tileId == tileId &&
              feature.batchId == batchId
            )
              return 1;
            if (content.variantIdentifier.includes("external")) {
              if (
                feature.getInfo().batchTable.properties &&
                feature.getInfo().batchTable.properties[0]
              ) {
                feature.getInfo().batchTable.properties[0].map((value) => {
                  if (Array.isArray(value)) {
                    if (value[0] == "IsExternal" && value[1] == true) {
                      feature.toHide = false;
                      return 1;
                    }
                  }
                });
              }
            }
            if (!feature.toHide) return 1;

            if (content.variantIdentifier == "file") return 1;
            return 0;
          },
        },
      });

      this.itownsView.getLayerById(content.id).style = myStyle;
    }
  }

  deleteContents(geoVolume) {
    for (let c of geoVolume.content) {
      this.delete3DTilesContent(c);
      this.updateShowButton(c);
    }
  }

  delete3DTilesContent(content) {
    if (this.itownsView.getLayerById(content.id) != undefined) {
      this.itownsView.removeLayer(content.id);
    }
  }

  updateShowButton(content) {
    let showButton = document.getElementById(content.id + "_show_button");
    if (showButton) {
      if (this.itownsView.getLayerById(content.id) != undefined) {
        showButton.classList.remove("w3-grey");
        showButton.children[0].src = "../assets/icons/eye.svg";
      } else {
        showButton.children[0].src = "../assets/icons/eye-slash.svg";
        showButton.classList.add("w3-grey");
      }
    }
  }

  createShowButton(c, isPc = false) {
    let visualisator = document.createElement("button");
    visualisator.className =
      "w3-btn w3-medium w3-bar-item w3-round w3-border w3-right w3-grey";
    visualisator.id = `${c.id}_show_button`;
    var logo = document.createElement("img");
    logo.width = "20";
    logo.src = "../assets/icons/eye-slash.svg";
    visualisator.appendChild(logo);
    visualisator.onclick = () => {
      if (this.itownsView.getLayerById(c.id) == undefined) {
        if (isPc) this.visualizePointCloudContent(c);
        else this.visualize3DTilesContent(c);
      } else {
        this.delete3DTilesContent(c);
      }
      this.updateShowButton(c);
    };
    return visualisator;
  }

  writeGeoVolume(geovolume, htmlParent) {
    if (geovolume.id && geovolume.links) {
      var li = document.createElement("div");
      li.className = "geovolume-el";
      var linkToSelf = "";
      for (let link of geovolume.links) {
        if (link.rel == "self") {
          linkToSelf = link.href;
        }
      }

      if (geovolume.parent) {
        var button_parent = document.createElement("button");
        button_parent.className = "w3-btn w3-round w3-border return";
        logo = document.createElement("img");
        logo.src = "../assets/icons/return.svg";
        logo.width = "20";
        button_parent.appendChild(logo);
        button_parent.onclick = () => {
          this.dispatchEvent({
            type: GeoVolumeWindow.SELECTED_GEOVOLUME_UPDATED,
            message: geovolume.parent,
          });
        };
        li.appendChild(button_parent);
      }

      var div_name = document.createElement("div");
      var a = document.createElement("a");
      a.href = linkToSelf;
      a.target = "_blank";
      a.innerText = geovolume.id;
      div_name.appendChild(a);
      li.appendChild(div_name);

      var bboxButton = document.createElement("button");
      var childrenButton = document.createElement("button");

      bboxButton.className = "w3-btn w3-round w3-grey w3-border";
      logo = document.createElement("img");
      logo.src = "../assets/icons/cube.svg";
      logo.width = "20";
      bboxButton.appendChild(logo);
      bboxButton.onclick = () => {
        if (geovolume.bboxGeom.visible) {
          bboxButton.classList.remove("w3-grey");
        } else {
          bboxButton.classList.add("w3-grey");
        }
        geovolume.changeBboxVisibility();
        this.itownsView.notifyChange();
      };
      li.appendChild(bboxButton);

      if (geovolume.children.length > 0) {
        childrenButton.className = "w3-btn w3-round w3-border ";
        var logo = document.createElement("img");
        logo.src = "../assets/icons/hierarchy.svg";
        logo.width = "20";
        childrenButton.appendChild(logo);
        childrenButton.onclick = () => {
          if (geovolume.children[0].bboxGeom.visible)
            childrenButton.classList.remove("w3-grey");
          else {
            childrenButton.classList.add("w3-grey");
            bboxButton.classList.remove("w3-grey");
            geovolume.hideBbox();
          }

          for (let children of geovolume.children) {
            children.changeBboxVisibility();
          }
          this.itownsView.notifyChange();
        };
        li.appendChild(childrenButton);
      }

      if (geovolume.content.length > 0) {
        var representationsList = document.createElement("ul");
        representationsList.className = "w3-ul";
        for (let c of geovolume.content) {
          c.id = geovolume.id + "_" + c.title;
          var representationEl = document.createElement("li");
          representationEl.id = c.id;
          representationEl.className = "w3-bar";
          var a_name = document.createElement("div");
          a_name.innerText = c.title;
          a_name.className = "w3-bar-item";
          representationEl.appendChild(a_name);
          if (c.type.includes("3dtiles")) {
            let visualisator = this.createShowButton(c);
            a_name.append(visualisator);
          } else if (c.type.includes("pnts")) {
            let visualisator = this.createShowButton(c, true);
            a_name.append(visualisator);
          } else if (c.type.includes("sensor")) {
            var sensorDiv = document.createElement("a");
            sensorDiv.id = "geoVolume_sensor";
            a_name.append(sensorDiv);
          }
          representationsList.appendChild(representationEl);
        }
        li.appendChild(representationsList);
      }

      htmlParent.appendChild(li);
    }
  }

  displayCollectionsInHTML() {
    if (this.geoVolumeSource.Collections) {
      let list = this.geoVolumeListElement;
      list.innerHTML = "";
      for (let geoVolume of this.geoVolumeSource.Collections)
        this.writeGeoVolume(geoVolume, list);
    }
  }

  displayGeoVolumeInHTML(geoVolume) {
    let list = this.geoVolumeListElement;
    list.innerHTML = "";
    this.writeGeoVolume(geoVolume, list);
  }

  deleteBboxGeomOfGeovolumes() {
    for (let geoVolume of this.geoVolumeSource.Collections)
      geoVolume.deleteBbox(this.itownsView.scene);
  }

  windowDestroyed() {
    this.app.viewerDivElement.removeEventListener(
      "mousedown",
      this.clickListener
    );
    this.deleteBboxGeomOfGeovolumes();
    this.itownsView.notifyChange();
  }

  get getCollectionsButtonId() {
    return `get_collections_button`;
  }

  get getCollectionsButtonIdElement() {
    return findChildByID(this.rootHtml, this.getCollectionsButtonId);
  }

  get getCollectionsByExtentButtonId() {
    return `get_collections_by_extent_button`;
  }

  get getCollectionsByExtentButtonIdElement() {
    return findChildByID(this.rootHtml, this.getCollectionsByExtentButtonId);
  }

  get geoVolumeDivId() {
    return `geovolume_div`;
  }

  get geoVolumeListId() {
    return `geovolume_list`;
  }

  get geoVolumeListElement() {
    return findChildByID(this.rootHtml, this.geoVolumeListId);
  }

  static get GEOVOLUME_COLLECTION_UPDATED() {
    return "GEOVOLUME_COLLECTION_UPDATED";
  }

  static get GEOVOLUME_SHOWN() {
    return "GEOVOLUME_SHOWN";
  }
  static get SELECTED_GEOVOLUME_UPDATED() {
    return "SELECTED_GEOVOLUME_UPDATED";
  }
}
