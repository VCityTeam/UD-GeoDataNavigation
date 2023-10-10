/** @format */

import { loadMultipleJSON, initScene } from "@ud-viz/utils_browser";
import * as proj4 from "proj4";
import * as itowns from "itowns";
import css from "./style.css";
/* eslint-disable no-new */

loadMultipleJSON([
  "../assets/config/all_widget.json",
  "../assets/config/extent_lyon.json",
  "../assets/config/frame3D_planars.json",
  "../assets/config/layer/3DTiles.json",
  "../assets/config/layer/base_maps.json",
  "../assets/config/layer/elevation.json",
  "../assets/config/styles.json",
  "../assets/config/widget/about.json",
  "../assets/config/widget/help.json",
  "../assets/config/widget/temporal.json",
  "../assets/config/widget/sparql_widget.json",
  "../assets/config/server/sparql_server.json",
]).then((configs) => {
  // http://proj4js.org/
  // define a projection as a string and reference it that way
  // the definition of the projection should be in config TODO_ISSUE
  proj4.default.defs(
    configs["extent_lyon"].crs,
    "+proj=lcc +lat_1=45.25 +lat_2=46.75" +
      " +lat_0=46 +lon_0=3 +x_0=1700000 +y_0=5200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
  );

  const extent = new itowns.Extent(
    configs["extent_lyon"].crs,
    parseInt(configs["extent_lyon"].west),
    parseInt(configs["extent_lyon"].east),
    parseInt(configs["extent_lyon"].south),
    parseInt(configs["extent_lyon"].north)
  );

  // create a itowns planar view
  const viewDomElement = document.createElement("div");
  viewDomElement.classList.add("full_screen");
  document.body.appendChild(viewDomElement);
  const view = new itowns.PlanarView(viewDomElement, extent);

  // init scene 3D
  initScene(view.camera.camera3D, view.mainLoop.gfxEngine.renderer, view.scene);

  view.addLayer(
    new itowns.ColorLayer(configs["base_maps"][0]["layer_name"], {
      updateStrategy: {
        type: itowns.STRATEGY_DICHOTOMY,
        options: {},
      },
      source: new itowns.WMSSource({
        extent: extent,
        name: configs["base_maps"][0]["name"],
        url: configs["base_maps"][0]["url"],
        version: configs["base_maps"][0]["version"],
        crs: extent.crs,
        format: configs["base_maps"][0]["format"],
      }),
      transparent: true,
    })
  );

  const isTextureFormat =
    configs["elevation"]["format"] == "image/jpeg" ||
    configs["elevation"]["format"] == "image/png";
  view.addLayer(
    new itowns.ElevationLayer(configs["elevation"]["layer_name"], {
      useColorTextureElevation: isTextureFormat,
      colorTextureElevationMinZ: isTextureFormat
        ? configs["elevation"]["colorTextureElevationMinZ"]
        : null,
      colorTextureElevationMaxZ: isTextureFormat
        ? configs["elevation"]["colorTextureElevationMaxZ"]
        : null,
      source: new itowns.WMSSource({
        extent: extent,
        url: configs["elevation"]["url"],
        name: configs["elevation"]["name"],
        crs: extent.crs,
        heightMapWidth: 256,
        format: configs["elevation"]["format"],
      }),
    })
  );
});
